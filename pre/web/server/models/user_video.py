from extensions import db
from datetime import datetime

class UserVideo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_name = db.Column(db.String(255), nullable=False)
    video_path = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<UserVideo {self.id} - {self.video_name}>"

    def save(self):
        db.session.add(self)
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'video_name': self.video_name,
            'video_path': self.video_path,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

    @classmethod
    def get_by_id(cls, video_id):
        return cls.query.get(video_id)
