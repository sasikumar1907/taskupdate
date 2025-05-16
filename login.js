document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        // Clear previous error messages
        errorMessage.textContent = '';

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Basic Validation
        if (username === '' || password === '') {
            errorMessage.textContent = 'Both username and password are required.';
            return;
        }

        // --- Simulated Authentication ---
        // In a real application, you would send this data to a server.

        // Updated credentials
        if (username === 'admin' && password === 'password') { // <<< MODIFIED HERE

            // Successful login
            console.log('Login successful for:', username); // For debugging

            // Optional: Store username if you want to display it on the dashboard
            // localStorage.setItem('loggedInUsername', username);

            // Redirect to index.html (or your dashboard page)
            window.location.href = 'index.html';// new page login

        } else {
            // Failed login
            errorMessage.textContent = 'Invalid username or password.';
            // Optionally, clear password field on failed attempt for security
            // passwordInput.value = '';
        }
    });

    // Optional: Clear error message when user starts typing again
    usernameInput.addEventListener('input', () => {
        if (errorMessage.textContent) {
            errorMessage.textContent = '';
        }
    });
    passwordInput.addEventListener('input', () => {
        if (errorMessage.textContent) {
            errorMessage.textContent = '';
        }
    });
});