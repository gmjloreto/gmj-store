document.addEventListener('DOMContentLoaded', function() {
    const token = getCookie('track-id')

    if (!token) {
        setCookie('track-id', crypto.randomUUID())
    }

    window.trackToken = token
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value) {
    const maxAge = 400 * 24 * 60 * 60; 
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`;
}
