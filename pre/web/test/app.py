from flask import Flask

def create_app():
    app = Flask(__name__)

    @app.route('/')
    def index():
        return 'Hello, World!'

    return app

# pytest의 fixture를 사용하여 앱과 클라이언트 제공
def test_index(client):
    response = client.get('/')
    assert response.get_data(as_text=True) == 'Hello, World!'