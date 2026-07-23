from rest_framework import serializers
from .models import *
import random
from django.core.mail import send_mail
from django.conf import settings

# User = get_user_model()  Dyanmic and flexible way of obtaining User model

# Serializers convert python objects to readable JSON for the frontend to be able to process the data
class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password"]
        extra_kwargs = {
            "password": {"write_only": True} # frontend can only send password, but API will never return it
        }
    def create(self, validated_data):
        print("Inside create()")
        base = (
            validated_data["first_name"].lower() +
            validated_data["last_name"].lower()
        )

        while True:
            username = f"{base}{random.randint(100,999)}"
            if not User.objects.filter(username=username).exists():
                break
        print(validated_data)
        print(username)
        validated_data["username"] = username
        user = User.objects.create_user(**validated_data)

        try:
            send_mail("Your Username", f"Your username is {username}", settings.DEFAULT_FROM_EMAIL, [user.email])
            print('✅ Email sent successfully!')
        except Exception as e:
            print(e)

        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name"]

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['user', 'file', 'name', 'uploaded']

from rest_framework import serializers
from .models import Race

class RaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Race
        fields = [
            "id",
            "user",
            "uploaded_file",
            "name",
            "event",
            "date",
            "distance",
            "time_sec",
            "elevation",
            "humidity",
            "surface",
            "temperature",
        ]
        read_only_fields = ["id", "user"]
