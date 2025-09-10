document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Registration functionality
    const startRegBtn = document.getElementById('start-reg');
    const stopRegBtn = document.getElementById('stop-reg');
    const checkRegBtn = document.getElementById('check-reg');
    const checkBalanceBtn = document.getElementById('check-balance');
    const regStatus = document.getElementById('reg-status');
    let regMediaRecorder;
    let regAudioChunks = [];
    let regTimeout;

    // Check balance functionality
    checkBalanceBtn.addEventListener('click', async () => {
        regStatus.innerHTML = '<p class="info">Checking wallet balance...</p>';

        try {
            const response = await fetch('http://localhost:3000/check-balance');
            const result = await response.json();

            if (result.sufficient) {
                regStatus.innerHTML = `
                    <p class="success">Wallet balance is sufficient!</p>
                    <p class="info">Balance: ${result.balanceInMatic} MATIC</p>
                    <p class="info">Estimated cost: ${result.estimatedCost} MATIC</p>
                    <p class="info">Current gas price: ${result.currentGasPrice} gwei</p>
                `;
            } else {
                regStatus.innerHTML = `
                    <p class="error">Insufficient wallet balance!</p>
                    <p class="error">Balance: ${result.balanceInMatic} MATIC</p>
                    <p class="error">Estimated cost: ${result.estimatedCost} MATIC</p>
                    <p class="error">Current gas price: ${result.currentGasPrice} gwei</p>
                    <p class="warning">Please add more MATIC to your wallet.</p>
                `;
            }
        } catch (error) {
            regStatus.innerHTML = `<p class="error">Error checking balance: ${error.message}</p>`;
        }
    });

    // Check registration functionality
    checkRegBtn.addEventListener('click', async () => {
        const walletAddressInput = document.getElementById('wallet-address');
        const walletAddress = walletAddressInput.value;

        if (!walletAddress) {
            regStatus.innerHTML = '<p class="error">Please enter your wallet address</p>';
            return;
        }

        regStatus.innerHTML = '<p class="info">Checking registration...</p>';

        try {
            const response = await fetch(`http://localhost:3000/check-registration/${walletAddress}`);
            const result = await response.json();

            if (result.isRegistered) {
                regStatus.innerHTML = `<p class="success">Address ${result.address} is registered</p>`;
            } else {
                regStatus.innerHTML = `<p class="error">Address ${result.address} is not registered</p>`;
            }
        } catch (error) {
            regStatus.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    });

    startRegBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            regMediaRecorder = new MediaRecorder(stream);
            regAudioChunks = [];

            regMediaRecorder.ondataavailable = event => {
                regAudioChunks.push(event.data);
            };

            regMediaRecorder.onstop = async () => {
                const audioBlob = new Blob(regAudioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'registration.wav');

                const walletAddress = document.getElementById('wallet-address').value;
                if (!walletAddress) {
                    regStatus.innerHTML = '<p class="error">Please enter your wallet address</p>';
                    return;
                }

                // Show processing steps
                regStatus.innerHTML = '<p class="info">Processing audio and sending transaction...</p>';

                try {
                    const response = await fetch('http://localhost:3000/register', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        regStatus.innerHTML = `
                            <p class="success">Registration confirmed!</p>
                            <p>Transaction: ${result.txHash}</p>
                            <p class="info">Block: ${result.blockNumber} | Gas Used: ${result.gasUsed}</p>
                        `;
                    } else {
                        regStatus.innerHTML = `<p class="error">Registration failed: ${result.message}</p>`;
                        if (result.error) {
                            regStatus.innerHTML += `<p class="error">Details: ${result.error}</p>`;
                        }
                    }
                } catch (error) {
                    regStatus.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            };

            regMediaRecorder.start();
            startRegBtn.disabled = true;
            stopRegBtn.disabled = false;
            regStatus.innerHTML = '<p class="info">Recording... Speak your passphrase (2 seconds)</p>';

            // Auto-stop after 2 seconds
            regTimeout = setTimeout(() => {
                if (regMediaRecorder && regMediaRecorder.state === 'recording') {
                    regMediaRecorder.stop();
                    regMediaRecorder.stream.getTracks().forEach(track => track.stop());
                    startRegBtn.disabled = false;
                    stopRegBtn.disabled = true;
                }
            }, 2000);

        } catch (error) {
            regStatus.innerHTML = `<p class="error">Error accessing microphone: ${error.message}</p>`;
        }
    });

    stopRegBtn.addEventListener('click', () => {
        clearTimeout(regTimeout);
        regMediaRecorder.stop();
        regMediaRecorder.stream.getTracks().forEach(track => track.stop());
        startRegBtn.disabled = false;
        stopRegBtn.disabled = true;
    });

    // Authentication functionality
    const startAuthBtn = document.getElementById('start-auth');
    const stopAuthBtn = document.getElementById('stop-auth');
    const authStatus = document.getElementById('auth-status');
    let authMediaRecorder;
    let authAudioChunks = [];
    let authTimeout;

    startAuthBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            authMediaRecorder = new MediaRecorder(stream);
            authAudioChunks = [];

            authMediaRecorder.ondataavailable = event => {
                authAudioChunks.push(event.data);
            };

            authMediaRecorder.onstop = async () => {
                const audioBlob = new Blob(authAudioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'authentication.wav');

                const walletAddress = document.getElementById('auth-address').value;
                if (!walletAddress) {
                    authStatus.innerHTML = '<p class="error">Please enter your wallet address</p>';
                    return;
                }

                formData.append('address', walletAddress);

                // Show processing steps
                authStatus.innerHTML = '<p class="info">Processing audio and authenticating...</p>';

                try {
                    const response = await fetch('http://localhost:3000/authenticate', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        authStatus.innerHTML = `
                            <p class="success">Authentication successful!</p>
                            <p>Transaction: ${result.txHash}</p>
                        `;
                    } else {
                        authStatus.innerHTML = `
                            <p class="error">Authentication failed: ${result.message}</p>
                            <p>Transaction: ${result.txHash}</p>
                        `;
                        if (result.error) {
                            authStatus.innerHTML += `<p class="error">Details: ${result.error}</p>`;
                        }
                    }
                } catch (error) {
                    authStatus.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            };

            authMediaRecorder.start();
            startAuthBtn.disabled = true;
            stopAuthBtn.disabled = false;
            authStatus.innerHTML = '<p class="info">Recording... Speak your passphrase (2 seconds)</p>';

            // Auto-stop after 2 seconds
            authTimeout = setTimeout(() => {
                if (authMediaRecorder && authMediaRecorder.state === 'recording') {
                    authMediaRecorder.stop();
                    authMediaRecorder.stream.getTracks().forEach(track => track.stop());
                    startAuthBtn.disabled = false;
                    stopAuthBtn.disabled = true;
                }
            }, 2000);

        } catch (error) {
            authStatus.innerHTML = `<p class="error">Error accessing microphone: ${error.message}</p>`;
        }
    });

    stopAuthBtn.addEventListener('click', () => {
        clearTimeout(authTimeout);
        authMediaRecorder.stop();
        authMediaRecorder.stream.getTracks().forEach(track => track.stop());
        startAuthBtn.disabled = false;
        stopAuthBtn.disabled = true;
    });
});