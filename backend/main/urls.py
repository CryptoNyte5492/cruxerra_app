from django.urls import path, include
from rest_framework import routers
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from .views import *

router = DefaultRouter();
router.register(r'runnersviews', RunnerView, basename='runners-view')

urlpatterns = [

    path('auth/register/', RegisterView.as_view(), name='register-view'),
    path('auth/user/', UserView.as_view(), name='user'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('dashboard/', UserView.as_view(), name='user_view'),
    path('dashboard/fileUpload/', UploadView.as_view(), name='uploaded_view'),
    path('runners/prediction/', RunnerPredictionView.as_view(), name='runner_prediction'),

    path('', include(router.urls))
]
