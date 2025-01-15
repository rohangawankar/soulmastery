document.addEventListener('DOMContentLoaded', async () => {
    let customerData = {
        firstName: '',
        lastName: '',
        email: '',

    };

    let stripe;
    let elements;

    try {
        // Fetch public configuration from the backend
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) throw new Error('Failed to load configuration');
        const { publicKey, publicDomain } = await configResponse.json();

        stripe = Stripe(publicKey);

        // Fetch PaymentIntent client secret from the backend
        const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 2500,
                currency: 'usd',
                customerData,
            }),
        });
        
        if (!paymentIntentResponse.ok) throw new Error('Failed to create payment intent');
        const { clientSecret } = await paymentIntentResponse.json();

        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount('#payment-element');
    } catch (error) {
        console.error('Error during initialization:', error.message);
        return;
    }

    document.getElementById('personal-form').addEventListener('submit', (event) => {
        event.preventDefault();

        customerData.firstName = document.getElementById('firstName').value;
        customerData.lastName = document.getElementById('lastName').value;
        customerData.email = document.getElementById('email').value;

        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '66.66%';
    });

    // Handle Payment Submission
    document.getElementById('payment-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {},
                redirect: 'if_required',
            });

            if (error) {
                // Payment Failed: Show error message
                document.getElementById('step-2').classList.add('hidden');
                document.getElementById('step-3').classList.remove('hidden');

                // Show error-related content
                document.getElementById('error-icon').classList.remove('hidden');
                document.getElementById('error-message-header').classList.remove('hidden');
                document.getElementById('error-description').classList.remove('hidden');
                document.getElementById('try-again-button').classList.remove('hidden');
            } else {
                // Payment Successful: Send data to ActiveCampaign before showing confirmation
                await sendToActiveCampaign(customerData);

                // Show success UI
                document.getElementById('step-2').classList.add('hidden');
                document.getElementById('step-3').classList.remove('hidden');

                // Show success-related content
                document.getElementById('success-icon').classList.remove('hidden');
                document.getElementById('success-message').classList.remove('hidden');
                document.getElementById('success-description').classList.remove('hidden');
                document.getElementById('progress-bar').style.width = '100%';
            }
        } catch (err) {
            console.error('Error during payment:', err);
            document.getElementById('error-message').textContent = 'An error occurred. Please try again.';
        }
    });

    // Handle "Try Again" button
    document.getElementById('try-again-button').addEventListener('click', () => {
        // Reset the error message and transition back to the payment screen
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '66.66%';

        // Hide error-related content
        document.getElementById('error-icon').classList.add('hidden');
        document.getElementById('error-message-header').classList.add('hidden');
        document.getElementById('error-description').classList.add('hidden');
        document.getElementById('try-again-button').classList.add('hidden');
    });

    async function sendToActiveCampaign(data) {
        try {
            // Send customer data to the server for processing
            const response = await fetch('/api/activecampaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                console.error('Failed to send data to ActiveCampaign:', await response.text());
                return;
            }

            console.log('Successfully sent data to ActiveCampaign');
        } catch (error) {
            console.error('Error sending to ActiveCampaign:', error);
        }
    }


}); 
