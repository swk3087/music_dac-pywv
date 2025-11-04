"""
Configuration and API Keys
설정 및 API 키 관리
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ==============================================
# Spotify API Configuration
# ==============================================
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID', '')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET', '')
SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8888/callback'
SPOTIFY_SCOPE = ' '.join([
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-follow-read',
    'user-top-read'
])

# ==============================================
# Gemini API Configuration
# ==============================================
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# ==============================================
# Display Configuration
# ==============================================
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 480

# Font sizes
FONT_SIZE_LARGE = 16
FONT_SIZE_MEDIUM = 14
FONT_SIZE_SMALL = 12

# ==============================================
# Colors (Spotify Theme)
# ==============================================
COLOR_PRIMARY = '#1DB954'      # Spotify Green
COLOR_SECONDARY = '#1ED760'    # Lighter Green
COLOR_BACKGROUND = '#16181D'   # Deep Charcoal
COLOR_BACKGROUND_ELEVATED = '#1E2128'  # Elevated Surfaces
COLOR_SURFACE = '#23262F'      # Soft Graphite
COLOR_SURFACE_ALT = '#2B303A'  # Muted Surface
COLOR_TEXT = '#FFFFFF'         # White
COLOR_TEXT_SECONDARY = '#AAB1BC'  # Muted Gray
COLOR_ACCENT = '#66FFE0'       # Teal Accent
COLOR_ERROR = '#E22134'        # Red
COLOR_WARNING = '#FFA500'      # Orange

# Gradients
GRADIENT_NIGHTFALL = (
    "qlineargradient(x1:0, y1:0, x2:1, y2:1, "
    "stop:0 #0C1118, stop:0.45 #121925, stop:1 #0B1622)"
)

# ==============================================
# Application Settings
# ==============================================
# Update intervals (milliseconds)
PLAYBACK_UPDATE_INTERVAL = 1000  # 1 second
UI_REFRESH_INTERVAL = 100        # 0.1 second

# Limits
MAX_SEARCH_RESULTS = 20
MAX_AI_SUGGESTIONS = 4
MAX_PLAYLISTS = 50
MAX_TRACKS = 100

# Cache settings
ENABLE_CACHE = True
CACHE_DURATION = 300  # seconds (5 minutes)

# Debug mode
DEBUG_MODE = os.getenv('DEBUG_MODE', 'False').lower() == 'true'

# ==============================================
# Validation
# ==============================================
def validate_config():
    """설정 유효성 검사"""
    errors = []
    
    if not SPOTIFY_CLIENT_ID:
        errors.append("SPOTIFY_CLIENT_ID is not set")
    
    if not SPOTIFY_CLIENT_SECRET:
        errors.append("SPOTIFY_CLIENT_SECRET is not set")
    
    if not GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY is not set")
    
    if errors:
        print("\n⚠️  Configuration Errors:")
        for error in errors:
            print(f"  - {error}")
        print("\n💡 Please check your .env file and make sure all API keys are set.\n")
        return False
    
    return True


# Validate on import
if not validate_config():
    print("⚠️  Warning: Some configuration values are missing.")
    print("The application may not work correctly without proper API keys.\n")
