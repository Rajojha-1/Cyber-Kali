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


def fetch_resources(conn):
    rows = conn.execute('SELECT id, title, url, order_index FROM resources ORDER BY order_index ASC').fetchall()
    return [dict(r) for r in rows]


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
    if not title or not url_val:
        flash('Resource title and URL are required', 'error')
        return redirect(url_for('admin_dashboard'))

    with get_db_connection() as conn:
        max_order = conn.execute('SELECT COALESCE(MAX(order_index), -1) FROM resources').fetchone()[0]
        next_order = (max_order if max_order is not None else -1) + 1
        conn.execute('INSERT INTO resources (title, url, order_index) VALUES (?, ?, ?)', (title, url_val, next_order))
        conn.commit()
    return redirect(url_for('admin_dashboard'))


@app.route('/delete-resource/<int:res_id>', methods=['POST'])
def delete_resource(res_id: int):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    with get_db_connection() as conn:
        # Get order of the item to delete
        row = conn.execute('SELECT order_index FROM resources WHERE id = ?', (res_id,)).fetchone()
        if row:
            order_idx = row['order_index']
            conn.execute('DELETE FROM resources WHERE id = ?', (res_id,))
            # Shift down items after this
            conn.execute('UPDATE resources SET order_index = order_index - 1 WHERE order_index > ?', (order_idx,))
            conn.commit()
    return redirect(url_for('admin_dashboard'))


@app.route('/move-resource/<int:res_id>/<string:direction>', methods=['POST'])
def move_resource(res_id: int, direction: str):
    redirect_if_needed = require_admin()
    if redirect_if_needed:
        return redirect_if_needed

    if direction not in ('up', 'down'):
        abort(400)

    with get_db_connection() as conn:
        row = conn.execute('SELECT id, order_index FROM resources WHERE id = ?', (res_id,)).fetchone()
        if not row:
            abort(404)
        current_order = row['order_index']
        swap_with = current_order - 1 if direction == 'up' else current_order + 1

        other = conn.execute('SELECT id FROM resources WHERE order_index = ?', (swap_with,)).fetchone()
        if not other:
            return redirect(url_for('admin_dashboard'))

        other_id = other['id']
        # Swap order_index values
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
    return render_template('resources.html', resources=resources)


if __name__ == '__main__':
    # Ensure DB exists before running
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

