from .models import *
import csv, io
from .math import *
from rest_framework import status
from .serializer import RegisterSerializer, UserSerializer, RaceSerializer
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404

class RegisterView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
    

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
class UploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        all_races = []
        uploaded_file_ids = []
        files = request.FILES.getlist("file")

        if not files:
            return Response({"error": "No files uploaded"}, status=400)

        user = request.user

        try:
            for f in files:
                stream = io.StringIO(f.read().decode("utf-8"))
                f.seek(0)
                reader = csv.DictReader(stream)

                file_name = f.name
                filtered_file = UploadedFile.objects.filter(user=user, name=file_name)

                if not filtered_file.exists():
                    u_file = UploadedFile.objects.create(
                        user=user,
                        file=f,
                        name=file_name
                    )
                else:
                    u_file = filtered_file.first()

                uploaded_file_ids.append(u_file.id)

                for row in reader:
                    cleaned = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

                    exists = Race.objects.filter(
                        user=user,
                        uploaded_file=u_file,
                        name=cleaned['Athlete'],
                        event=cleaned['Event'],
                        date=cleaned['Date'],
                        distance=int(cleaned['Distance (m)']),
                    ).exists()

                    if not exists:
                        all_races.append(
                            Race(
                                user=user,
                                uploaded_file=u_file,
                                name=cleaned.get('Athlete', '').strip(),
                                event=cleaned.get('Event', '').strip(),
                                date=cleaned.get('Date'),
                                distance=safe_int(cleaned.get('Distance (m)')),
                                time_sec=parse_time_to_seconds(cleaned.get('Time', '0:00')),
                                elevation=safe_int(cleaned.get('Elevation Gain')),
                                humidity=safe_int(cleaned.get('Humidity (%)')),
                                surface=cleaned.get('Surface', '').strip(),
                                temperature=safe_int(cleaned.get('Temperature (F)')),
                            )
                        )

            if all_races:
                Race.objects.bulk_create(all_races)

            return Response({
                "message": "Upload successful",
                "file_id": uploaded_file_ids
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
        
class RunnerView(ModelViewSet):
    serializer_class = RaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Race.objects.filter(user=self.request.user)

        file_id = self.request.query_params.get('file_id')
        athlete = self.request.query_params.get('athlete')

        if file_id:
            queryset = queryset.filter(uploaded_file=file_id)
        if athlete:
            queryset = queryset.filter(name=athlete)
        return queryset.order_by("name", "date")
    
    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)

class RunnerPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        file_id = request.query_params.get("file_id")
        athlete = request.query_params.get("athlete")
        race_id = request.query_params.get("race_id")
        if not race_id:
            return Response(
                {"error": "Missing race_id"},
                status=400
            )

        if not athlete:
            return Response({"error": "Missing athlete"}, status=400)

        races = Race.objects.filter(user=request.user, name=athlete)
        if file_id:
            races = races.filter(uploaded_file=file_id)
        race = get_object_or_404(
            races,
            id=race_id
        )
        if race is None:
            return Response(
                {"error": "Race not found"},
                status=404
            )
        distance = race.distance
        elevation = race.elevation
        humidity = race.humidity
        surface = race.surface
        temp = race.temperature

        target_distance = safe_int(distance, None) if distance else None
        model = fit_athlete_performance_model(races, athlete)
        pred = predict_time(model,target_distance, temp, humidity, elevation, surface)

        if pred is None:
            return Response({"error": "Not enough race data to predict"}, status=404)

        return Response(pred)
