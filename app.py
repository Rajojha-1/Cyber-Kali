from flask import Flask, render_template, request, redirect, url_for, session, abort, send_from_directory, flash
import os
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename


def get_db_connection():
    connection = sqlite3.connect(os.path.join(os.path.dirname(__file__), 'blog.db'))
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                content TEXT,
                date TEXT
            )
            """
        )
        # Ensure image column exists
        cols = conn.execute('PRAGMA table_info(posts)').fetchall()
        col_names = {c[1] for c in cols}
        if 'image' not in col_names:
            conn.execute('ALTER TABLE posts ADD COLUMN image TEXT')
        # Resources table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                order_index INTEGER NOT NULL
            )
            """
        )
        # Ensure new roadmap columns exist
        res_cols = conn.execute('PRAGMA table_info(resources)').fetchall()
        res_col_names = {c[1] for c in res_cols}
        if 'branch' not in res_col_names:
            conn.execute("ALTER TABLE resources ADD COLUMN branch TEXT DEFAULT 'main'")
        if 'parent_id' not in res_col_names:
            conn.execute('ALTER TABLE resources ADD COLUMN parent_id INTEGER NULL')
        conn.commit()


app = Flask(
    __name__,
    static_url_path='/', 
    static_folder='static',
    template_folder='templates',
)

# Configure uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'replace-this-in-production')


# Serve assets directory at 

@app.route('/assets/<path:filename>')
def serve_assets(filename: str):
    assets_path = os.path.join(os.path.dirname(__file__), 'assets')
    return send_from_directory(assets_path, filename)


def is_admin_logged_in() -> bool:
    return session.get('admin_logged_in') is True


def require_admin():
    if not is_admin_logged_in():
        return redirect(url_for('admin_login'))
    return None


# Simple admin credential
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = os.environ.get(
    'ADMIN_PASSWORD_HASH',
    generate_password_hash(os.environ.get('ADMIN_PASSWORD', 'changeme')),
)


# Initialize DB at import time for environments without before_first_request
init_db()
# Clean up any legacy 'Welcome' entries
with get_db_connection() as _conn:
    remove_welcome_if_exists(_conn)


def fetch_resources(conn):
    rows = conn.execute('SELECT id, title, url, order_index, branch, parent_id FROM resources ORDER BY branch ASC, order_index ASC').fetchall()
    return [dict(r) for r in rows]

def remove_welcome_if_exists(conn) -> None:
    """Remove any auto-created 'Welcome' root resource if present."""
    conn.execute("DELETE FROM resources WHERE LOWER(title) = 'welcome'")
    conn.commit()


@app.route('/')
@app.route('/index.html')
def index():
    with get_db_connection() as conn:
        rows = conn.execute(
            'SELECT id, title, content, date, image FROM posts ORDER BY id DESC'
        ).fetchall()
    posts = [dict(row) for row in rows]
    return render_template('index.html', posts=posts)


@app.route('/blogs/<int:post_id>')
def blog_detail(post_id: int):
    with get_db_connection() as conn:
        row = conn.execute(
            'SELECT id, title, content, date, image FROM posts WHERE id = ?', (post_id,)
        ).fetchone()
    if row is None:
        abort(404)
    post = dict(row)
    return render_template('blogs.html', post=post)


@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'error')
    return render_template('admin-login.html')


@app.route('/admin')
def admin_dashboard():
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    with get_db_connection() as conn:
        rows = conn.execute('SELECT id, title, content, date, image FROM posts ORDER BY id DESC').fetchall()
        resources = fetch_resources(conn)
    posts = [dict(row) for row in rows]

    return render_template('admin.html', posts=posts, edit_post=None, resources=resources)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.route('/add-post', methods=['POST'])
def add_post():
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    tags = request.form.get('tags', '').strip()

    # Append tags to content for now to keep DB schema as requested
    if tags:
        content = f"{content}\n\nTags: {tags}"

    date_str = datetime.now().strftime('%Y-%m-%d %H:%M')

    if not title or not content:
        flash('Title and content are required', 'error')
        return redirect(url_for('admin_dashboard'))

    image_filename = None
    file = request.files.get('image')
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Make filename unique
        name, ext = os.path.splitext(filename)
        unique_name = f"{name}_{int(datetime.now().timestamp())}{ext}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
        file.save(save_path)
        image_filename = unique_name

    with get_db_connection() as conn:
        conn.execute(
            'INSERT INTO posts (title, content, date, image) VALUES (?, ?, ?, ?)',
            (title, content, date_str, image_filename),
        )
        conn.commit()

    return redirect(url_for('admin_dashboard'))


@app.route('/edit-post/<int:post_id>', methods=['GET', 'POST'])
def edit_post(post_id: int):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    with get_db_connection() as conn:
        row = conn.execute('SELECT id, title, content, date, image FROM posts WHERE id = ?', (post_id,)).fetchone()
    if row is None:
        abort(404)
    post = dict(row)

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        tags = request.form.get('tags', '').strip()

        if tags:
            # Replace or append tags: remove existing Tags: line if present, then add new
            content_lines = [line for line in content.splitlines() if not line.startswith('Tags:')]
            content = '\n'.join(content_lines)
            content = f"{content}\n\nTags: {tags}"

        if not title or not content:
            flash('Title and content are required', 'error')
            return redirect(url_for('edit_post', post_id=post_id))

        # Handle optional new image
        image_filename = post.get('image')
        file = request.files.get('image')
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            unique_name = f"{name}_{int(datetime.now().timestamp())}{ext}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(save_path)
            image_filename = unique_name

        with get_db_connection() as conn:
            conn.execute(
                'UPDATE posts SET title = ?, content = ?, image = ? WHERE id = ?',
                (title, content, image_filename, post_id),
            )
            conn.commit()

        return redirect(url_for('admin_dashboard'))

    # GET: render admin dashboard with edit form populated
    with get_db_connection() as conn:
        rows = conn.execute('SELECT id, title, content, date, image FROM posts ORDER BY id DESC').fetchall()
    posts = [dict(row) for row in rows]
    return render_template('admin.html', posts=posts, edit_post=post)


@app.route('/delete-post/<int:post_id>', methods=['POST'])
def delete_post(post_id: int):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    with get_db_connection() as conn:
        conn.execute('DELETE FROM posts WHERE id = ?', (post_id,))
        conn.commit()
    return redirect(url_for('admin_dashboard'))


@app.route('/add-resource', methods=['POST'])
def add_resource():
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    title = request.form.get('res_title', '').strip()
    url_val = request.form.get('res_url', '').strip()
    branch = 'main'
    parent_id = None
    if not title or not url_val:
        flash('Resource title and URL are required', 'error')
        return redirect(url_for('admin_dashboard'))

    with get_db_connection() as conn:
        root_id = ensure_root_exists(conn)
        # Default non-main parent to root if not provided
        max_order_row = conn.execute('SELECT COALESCE(MAX(order_index), -1) FROM resources WHERE branch = ?', (branch,)).fetchone()
        max_order = max_order_row[0] if max_order_row is not None else -1
        next_order = (max_order if max_order is not None else -1) + 1
        conn.execute('INSERT INTO resources (title, url, order_index, branch, parent_id) VALUES (?, ?, ?, ?, ?)', (title, url_val, next_order, branch, parent_id))
        conn.commit()
    return redirect(url_for('admin_dashboard'))


@app.route('/delete-resource/<int:res_id>', methods=['POST'])
def delete_resource(res_id: int):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    with get_db_connection() as conn:
        # Get order of the item to delete
        row = conn.execute('SELECT order_index, branch FROM resources WHERE id = ?', (res_id,)).fetchone()
        if row:
            order_idx = row['order_index']
            branch = row['branch']
            conn.execute('DELETE FROM resources WHERE id = ?', (res_id,))
            # Shift down items after this within the same branch
            conn.execute('UPDATE resources SET order_index = order_index - 1 WHERE branch = ? AND order_index > ?', (branch, order_idx))
            conn.commit()
    return redirect(url_for('admin_dashboard'))


@app.route('/move-resource/<int:res_id>/<string:direction>', methods=['POST'])
def move_resource(res_id: int, direction: str):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    if direction not in {'up', 'down'}:
        abort(400)

    with get_db_connection() as conn:
        row = conn.execute('SELECT id, order_index, branch FROM resources WHERE id = ?', (res_id,)).fetchone()
        if not row:
            abort(404)
        current_order = row['order_index']
        branch = row['branch']
        swap_with = current_order - 1 if direction == 'up' else current_order + 1

        other = conn.execute('SELECT id FROM resources WHERE branch = ? AND order_index = ?', (branch, swap_with)).fetchone()
        if not other:
            return redirect(url_for('admin_dashboard'))

        other_id = other['id']
        # Swap order_index values within the branch
        conn.execute('UPDATE resources SET order_index = ? WHERE id = ?', (swap_with, res_id))
        conn.execute('UPDATE resources SET order_index = ? WHERE id = ?', (current_order, other_id))
        conn.commit()

    return redirect(url_for('admin_dashboard'))


@app.route('/about')
def about_page():
    return render_template('about.html')


@app.route('/resources')
def resources_page():
    with get_db_connection() as conn:
        resources = fetch_resources(conn)

    # Only main branch, linear sequence
    main_items = [r for r in resources if (r.get('branch') or 'main') == 'main']
    main_items = sorted(main_items, key=lambda x: x.get('order_index', 0))

    step_x = 420
    margin_x = 0
    svg_height = 600

    y_pct = 58
    layout = []
    for i, r in enumerate(main_items):
        x = margin_x + i * step_x
        layout.append({
            'id': r['id'],
            'title': r['title'],
            'url': r['url'],
            'order_index': r.get('order_index', i),
            'x': x,
            'y_pct': y_pct,
        })

    total_width = margin_x + (len(main_items) if main_items else 1) * step_x + 200

    # Single path
    def build_path():
        y = int(svg_height * (y_pct / 100.0))
        d = f"M 0 {y} "
        segment = 300
        x = 0
        toggle = 1
        while x < total_width - 50:
            cx1 = x + segment // 2
            cy1 = y - 50 * toggle
            x2 = min(total_width - 50, x + segment)
            cy2 = y + 50 * toggle
            d += f"S {int(cx1)} {int(cy1)}, {int(x2)} {int(cy2)} "
            x += segment
            toggle *= -1
        return d.strip()

    branch_paths = [{ 'branch': 'main', 'd': build_path() }]

    return render_template('resources.html', layout=layout, branch_paths=branch_paths, canvas_width=total_width, svg_height=svg_height)


if __name__ == '__main__':
    # Ensure DB exists before running
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

