const menuToggle = document.querySelector('.menu-toggle');
const navPanel = document.querySelector('.nav-panel');

if (menuToggle && navPanel) {
  const setMenuOpen = (isOpen) => {
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন');
    navPanel.classList.toggle('is-open', isOpen);
  };

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  navPanel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
}

document.querySelectorAll('.combo-card__play, .product-card__play').forEach((playButton) => {
  playButton.addEventListener('click', async () => {
    const visual = playButton.closest('.combo-card__visual');
    const video = visual?.querySelector('.combo-card__video');
    const videoPath = playButton.dataset.video;

    if (!visual || !video || !videoPath) return;

    if (!video.src) video.src = videoPath;
    visual.classList.add('is-playing');
    video.hidden = false;
    playButton.hidden = true;

    try {
      await video.play();
    } catch {
      // Keep the visible player and native controls available if autoplay is blocked.
    }
  });
});

document.querySelectorAll('.faq-question').forEach((question) => {
  question.addEventListener('click', () => {
    const answerId = question.getAttribute('aria-controls');
    const answer = answerId ? document.getElementById(answerId) : null;
    const isOpen = question.getAttribute('aria-expanded') === 'true';

    if (!answer) return;

    question.setAttribute('aria-expanded', String(!isOpen));
    answer.hidden = isOpen;
    question.closest('.faq-item')?.setAttribute('data-open', String(!isOpen));
  });
});

const orderForm = document.querySelector('#order-form');
const quantityDisplay = document.querySelector('#quantity-value');
const quantityInput = orderForm?.querySelector('input[name="quantity"]');

if (orderForm && quantityDisplay && quantityInput) {
  orderForm.querySelectorAll('[data-quantity-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.quantityStep);
      const quantity = Math.min(99, Math.max(1, Number(quantityInput.value) + step));
      quantityInput.value = String(quantity);
      quantityDisplay.textContent = String(quantity);
    });
  });

  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!orderForm.reportValidity()) return;

    const status = orderForm.querySelector('#order-status');
    if (!status) return;

    const recipient = orderForm.dataset.emailRecipient.trim();
    if (!recipient) return;

    const submitButton = orderForm.querySelector('.order-form__submit');
    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());
    payload._subject = `নতুন অর্ডার — ${formData.get('product')}`;
    payload._template = 'table';

    if (submitButton) submitButton.disabled = true;
    status.textContent = 'আপনার অর্ডার পাঠানো হচ্ছে…';
    status.dataset.state = 'sending';

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || result.success === false || String(result.success).toLowerCase() === 'false') {
        throw new Error('Order submission was rejected.');
      }

      orderForm.reset();
      quantityInput.value = '1';
      quantityDisplay.textContent = '1';
      status.textContent = 'আপনার অর্ডারটি পাঠানো হয়েছে। আমরা শীঘ্রই ফোনে আপনার সঙ্গে যোগাযোগ করব। আরও পণ্য অর্ডার করতে চাইলে, আগের মতোই পছন্দের পণ্য নির্বাচন করে অর্ডার প্রক্রিয়া সম্পন্ন করুন।';
      status.dataset.state = 'success';
    } catch {
      status.textContent = 'অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন অথবা ফোনে যোগাযোগ করুন।';
      status.dataset.state = 'error';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
