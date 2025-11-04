from flask import Flask, render_template, request
import sys
from common import model
from chatbot import Chatbot
from characters import system_role, instruction
import atexit

# jjinchin 인스턴스 생성
jjinchin = Chatbot(
    model = model.basic,
    system_role = system_role,
    instruction = instruction,
    user = "민지",
    assistant = "고비"
)

application = Flask(__name__)

@application.route("/")
def hello():
    return "Hello goorm!"

@application.route("/welcome")
def welcome(): # 함수명은 꼭 welcome일 필요는 없습니다.
    return "Hello goorm!"

@application.route("/chat-app")
def chat_app():
    return render_template("chat.html")

@application.route("/chat-api", methods=['POST'])
def chat_api():
    request_message = request.json.get('request_message', '')
    jjinchin.add_user_message(request_message)

    # DB 질문 처리 먼저
    last_message = request_message.strip()
    if any(k in last_message for k in ["카메라 개수", "카메라 몇 대"]):
        count = jjinchin.get_camera_count()
        response_message = f"현재 설치된 카메라는 총 {count}대입니다."
        jjinchin.add_response(response_message)
        return {"response_message": response_message}

    if any(k in last_message for k in ["카메라 이름", "카메라 목록"]):
        camera_list = jjinchin.get_camera_list()
        response_message = "설치된 카메라 목록: " + ", ".join(camera_list) if camera_list else "설치된 카메라가 없습니다."
        jjinchin.add_response(response_message)
        return {"response_message": response_message}

    # 그 외 질문 → OpenAI 호출 (동기)
    response_message = jjinchin.get_response_content()
    return {"response_message": response_message}


@atexit.register
def shutdown():
    print("flask shutting down...")
    jjinchin.save_chat()

if __name__ == "__main__":
    application.run(host='0.0.0.0', port=int(sys.argv[1]))
