from common import client, makeup_response, gpt_num_tokens
import math
from memory_manager import MemoryManager
import psycopg2


class Chatbot:

    def __init__(self, model, system_role, instruction, **kwargs):
        self.context = [{"role": "system", "content": system_role}]
        self.model = model
        self.instruction = instruction
        self.max_token_size = 16 * 1024
        self.user = kwargs["user"]
        self.assistant = kwargs["assistant"]
        self.memoryManager = MemoryManager()
        self.context.extend(self.memoryManager.restore_chat())

        # PostgreSQL 연결
        self.pg_conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="pgadmin1002",
            host="192.168.243.24"
        )
        self.pg_cur = self.pg_conn.cursor()

    def add_user_message(self, user_message):
        self.context.append({"role": "user", "content": user_message, "saved": False})

    def _send_request(self):
        try:
            context = self.to_openai_contenxt()
            if gpt_num_tokens(context) > self.max_token_size:
                self.context.pop()
                return makeup_response("메시지 조금 짧게 보내줄래?")
            response = client.chat.completions.create(
                model=self.model,
                messages=context,
                temperature=0.5,
                top_p=1,
                max_tokens=256,
                frequency_penalty=0,
                presence_penalty=0
            ).model_dump()
        except Exception as e:
            print(f"Exception 오류({type(e)}) 발생:{e}")
            return makeup_response("[내 찐친 챗봇에 문제가 발생했습니다. 잠시 뒤 이용해주세요]")
        return response

    def send_request(self):
        self.context[-1]['content'] += self.instruction
        return self._send_request()

    def add_response(self, response):
        """응답을 context에 추가, 항상 문자열로 저장"""
        if isinstance(response, str):
            self.context.append({"role": "assistant", "content": response})
        elif isinstance(response, dict):
            try:
                content = response['choices'][0]['message']["content"]
                role = response['choices'][0]['message'].get("role", "assistant")
                self.context.append({"role": role, "content": content})
            except (KeyError, IndexError, TypeError):
                self.context.append({"role": "assistant", "content": str(response)})
        else:
            self.context.append({"role": "assistant", "content": str(response)})

    def get_camera_count(self):
        try:
            self.pg_cur.execute('SELECT COUNT(*) FROM camera_details;')
            result = self.pg_cur.fetchone()
            return int(result[0]) if result else 0
        except Exception as e:
            print("Error in get_camera_count:", e)
            return 0

    def get_camera_list(self):
        try:
            self.pg_cur.execute('SELECT "CameraName" FROM camera_details;')
            rows = self.pg_cur.fetchall()
            return [row[0] for row in rows] if rows else []
        except Exception as e:
            print("Error in get_camera_list:", e)
            return []

    def get_response_content(self):
        # 순수 사용자 입력만 사용 (instruction 제거)
        last_message = self.context[-1]["content"].split("instruction:")[0].strip()

        # 카메라 개수 질문
        if any(keyword in last_message for keyword in [
        "카메라 몇 대", "카메라 몇대", "카메라 몇 개", "카메라 몇개", "카메라 개수", "카메라 대수",
        "설치된 카메라 수", "카메라 총 몇 대"
    ]):
            count = self.get_camera_count()
            print("DB에서 조회한 카메라 개수:", count)
            response = f"현재 설치된 카메라는 총 {count}대입니다."
            self.add_response(response)
            return response

        # 카메라 목록 질문
        if any(keyword in last_message for keyword in ["카메라 이름", "카메라 목록"]):
            camera_list = self.get_camera_list()
            response = "설치된 카메라 목록: " + ", ".join(camera_list) if camera_list else "설치된 카메라가 없습니다."
            self.add_response(response)
            return response

        # 일반 질문 → OpenAI 호출
        response = self.send_request()
        if isinstance(response, dict):
            try:
                response = response['choices'][0]['message']['content']
            except (KeyError, IndexError, TypeError):
                response = str(response)
        elif not isinstance(response, str):
            response = str(response)
        self.add_response(response)
        return response

    def clean_context(self):
        for idx in reversed(range(len(self.context))):
            if self.context[idx]["role"] == "user":
                self.context[idx]["content"] = self.context[idx]["content"].split("instruction:\n")[0].strip()
                break

    def handle_token_limit(self, response):
        try:
            if isinstance(response, dict) and response.get('usage', {}).get('total_tokens', 0) > self.max_token_size:
                remove_size = math.ceil(len(self.context) / 10)
                self.context = [self.context[0]] + self.context[remove_size + 1:]
        except Exception as e:
            print(f"handle_token_limit exception:{e}")

    def to_openai_contenxt(self):
        return [{"role": v["role"], "content": v["content"]} for v in self.context]

    def save_chat(self):
        self.memoryManager.save_chat(self.context)
