let scriptPromise;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the secure payment window.'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function openRazorpayCheckout(order, { name, email, phone, onSuccess, onFailure, onDismiss }) {
  await loadRazorpay();
  if (!order.keyId) throw new Error('Online payments are not configured.');

  const checkout = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'SmartRide',
    description: `Booking #${order.bookingId}`,
    order_id: order.orderId,
    prefill: { name, email, contact: phone || '' },
    theme: { color: '#FF6B00' },
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  });
  checkout.on('payment.failed', (event) => {
    onFailure(event?.error?.description || 'Payment was not completed. You can try again.');
  });
  checkout.open();
  return checkout;
}
