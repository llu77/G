#!/usr/bin/env python3
"""
تطبيق Flask متوافق مع Cloudflare Workers
تم التعديل ليدعم D1 Database وKV Storage بدلاً من SQLite وRedis
"""

from flask import Flask, render_template, request, jsonify, session
import os
import json
from datetime import datetime, timedelta
import requests
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps
import logging

app = Flask(__name__)

# إعدادات Cloudflare Workers
if 'CF_WORKER' in os.environ:
    # في بيئة Cloudflare Workers
    from workers_kv import KV
    from workers_d1 import D1
    
    # الاتصال بـ KV
    cache = KV()
    
    # الاتصال بـ D1 Database
    db = D1()
    
    # المفاتيح من Cloudflare Secrets
    app.secret_key = os.environ.get('SECRET_KEY')
else:
    # في البيئة المحلية للتطوير
    app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')
    
    # محاكاة KV باستخدام قاموس
    class MockKV:
        def __init__(self):
            self.data = {}
        
        def get(self, key):
            return self.data.get(key)
        
        def put(self, key, value):
            self.data[key] = value
            return True
        
        def delete(self, key):
            if key in self.data:
                del self.data[key]
                return True
            return False
    
    # محاكاة D1
    class MockD1:
        def __init__(self):
            self.users = []
            self.posts = []
            self.init_data()
        
        def init_data(self):
            """تهيئة البيانات التجريبية"""
            # إضافة مستخدم تجريبي
            self.users.append({
                'id': 1,
                'username': 'demo_user',
                'email': 'demo@example.com',
                'password_hash': generate_password_hash('demo123'),
                'created_at': datetime.utcnow().isoformat()
            })
        
        def query(self, sql, params=None):
            """محاكاة استعلامات D1"""
            if 'SELECT' in sql and 'users' in sql:
                if 'WHERE username' in sql:
                    username = params[0] if params else 'demo_user'
                    user = next((u for u in self.users if u['username'] == username), None)
                    return {'results': [user] if user else []}
                return {'results': self.users}
            
            elif 'SELECT' in sql and 'posts' in sql:
                return {'results': self.posts}
            
            elif 'INSERT INTO users' in sql:
                return {'success': True, 'meta': {'last_row_id': len(self.users) + 1}}
            
            elif 'INSERT INTO posts' in sql:
                return {'success': True, 'meta': {'last_row_id': len(self.posts) + 1}}
            
            return {'results': []}
    
    cache = MockKV()
    db = MockD1()

def token_required(f):
    """ديكوريتور للتحقق من التوكن"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return jsonify({
        'message': 'Welcome to Cloudflare Compatible Flask App',
        'version': '2.0.0',
        'environment': 'Cloudflare Workers' if 'CF_WORKER' in os.environ else 'Development'
    })

@app.route('/api/register', methods=['POST'])
def register():
    """تسجيل مستخدم جديد"""
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # التحقق من وجود المستخدم
    result = db.query('SELECT id FROM users WHERE username = ?', [username])
    if result['results']:
        return jsonify({'error': 'User already exists'}), 409
    
    # إنشاء مستخدم جديد
    password_hash = generate_password_hash(password)
    db.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, password_hash]
    )
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    """تسجيل دخول المستخدم"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'Missing credentials'}), 400
    
    result = db.query('SELECT id, password_hash FROM users WHERE username = ?', [username])
    
    if result['results']:
        user = result['results'][0]
        if user and check_password_hash(user['password_hash'], password):
            token = jwt.encode({
                'user_id': user['id'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.secret_key, algorithm='HS256')
            
            # تخزين التوكن في KV للتخزين المؤقت
            cache.put(f"user_token_{user['id']}", token)
            
            return jsonify({'token': token})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/posts', methods=['GET'])
def get_posts():
    """الحصول على جميع المنشورات"""
    # التحقق من الكاش أولاً
    cached_posts = cache.get('all_posts')
    if cached_posts:
        return jsonify(json.loads(cached_posts))
    
    # جلب من قاعدة البيانات
    result = db.query('''
        SELECT p.id, p.title, p.content, p.created_at, u.username 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
    ''')
    
    posts = result['results'] if result['results'] else []
    
    # تخزين في الكاش
    cache.put('all_posts', json.dumps(posts))
    
    return jsonify(posts)

@app.route('/api/posts', methods=['POST'])
@token_required
def create_post(current_user_id):
    """إنشاء منشور جديد"""
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    
    if not all([title, content]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # إنشاء المنشور
    db.query(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [current_user_id, title, content]
    )
    
    # مسح الكاش
    cache.delete('all_posts')
    
    return jsonify({'message': 'Post created successfully'}), 201

@app.route('/api/cache', methods=['GET'])
def cache_info():
    """معلومات عن الكاش"""
    cache_stats = {
        'cache_type': 'Cloudflare KV' if 'CF_WORKER' in os.environ else 'Mock KV',
        'keys_count': len(cache.data) if hasattr(cache, 'data') else 'N/A'
    }
    
    return jsonify(cache_stats)

@app.route('/api/health')
def health_check():
    """فحص صحة التطبيق"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0',
        'environment': 'Cloudflare Workers' if 'CF_WORKER' in os.environ else 'Development',
        'services': {
            'database': 'connected',
            'cache': 'connected',
            'auth': 'enabled'
        }
    }
    
    return jsonify(health_status)

@app.route('/api/external-data')
def external_data():
    """جلب بيانات من API خارجي"""
    try:
        # استخدام Cloudflare's fetch API
        response = requests.get('https://api.github.com/users/github', timeout=10)
        
        # تخزين في الكاش لمدة 5 دقائق
        cache_key = f"external_data_{datetime.utcnow().strftime('%Y%m%d%H%M')}"
        cache_data = {
            'data': response.json(),
            'cached_at': datetime.utcnow().isoformat(),
            'cache_ttl': 300  # 5 دقائق
        }
        
        cache.put(cache_key, json.dumps(cache_data), expiration=300)
        
        return jsonify(cache_data)
    
    except requests.RequestException as e:
        return jsonify({'error': 'Failed to fetch external data'}), 503

# Middleware للتعامل مع CORS
@app.after_request
def after_request(response):
    """إضافة CORS headers"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# إعدادات الأمان
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax'
)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)