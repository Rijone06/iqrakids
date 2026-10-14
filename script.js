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
const productList = orderForm?.querySelector('#order-products');
const productTemplate = orderForm?.querySelector('#order-product-template');
const productCountInput = orderForm?.querySelector('input[name="product_types"]');
const productCountDisplay = orderForm?.querySelector('#product-count-value');
const orderConfirmation = document.querySelector('#order-confirmation');

if (orderForm && productList && productTemplate && productCountInput && productCountDisplay) {
  const renderProductRows = (count, initialProduct = '', preserveExisting = false) => {
    const previousRows = preserveExisting
      ? Array.from(productList.querySelectorAll('.order-product-item')).map((row) => ({
          product: row.querySelector('select')?.value ?? '',
          quantity: row.querySelector('input[type="hidden"]')?.value ?? '1'
        }))
      : [];
    productList.replaceChildren();
    for (let index = 1; index <= count; index += 1) {
      const row = productTemplate.content.firstElementChild.cloneNode(true);
      const select = row.querySelector('select');
      const quantityControl = row.querySelector('.quantity-control');
      const quantityDisplay = row.querySelector('output');
      const quantityInput = row.querySelector('input[type="hidden"]');

      select.name = `product_${index}`;
      select.setAttribute('aria-label', `পণ্য ${index} নির্বাচন করুন`);
      quantityControl.setAttribute('aria-label', `পণ্য ${index}-এর পরিমাণ`);
      row.querySelector('.order-product-item__quantity-label').id = `item-quantity-label-${index}`;
      quantityControl.setAttribute('aria-labelledby', `item-quantity-label-${index}`);
      quantityInput.name = `quantity_${index}`;
      if (previousRows[index - 1]) {
        select.value = previousRows[index - 1].product;
        quantityInput.value = previousRows[index - 1].quantity;
        quantityDisplay.textContent = previousRows[index - 1].quantity;
      } else if (index === 1 && initialProduct) {
        select.value = initialProduct;
      }
      productList.append(row);
    }
    productCountInput.value = String(count);
    productCountDisplay.textContent = String(count);
  };

  renderProductRows(1, '64 Pages IQRA Intelligence Book');

  orderForm.querySelectorAll('[data-product-count-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.productCountStep);
      const count = Math.min(8, Math.max(1, Number(productCountInput.value) + step));
      renderProductRows(count, '', true);
    });
  });

  productList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-item-quantity-step]');
    if (!button) return;
    const row = button.closest('.order-product-item');
    const input = row?.querySelector('input[type="hidden"]');
    const display = row?.querySelector('output');
    if (!input || !display) return;
    const quantity = Math.min(99, Math.max(1, Number(input.value) + Number(button.dataset.itemQuantityStep)));
    input.value = String(quantity);
    display.textContent = String(quantity);
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
    const orderDetails = Array.from({ length: Number(productCountInput.value) }, (_, index) => {
      const product = formData.get(`product_${index + 1}`);
      const quantity = formData.get(`quantity_${index + 1}`);
      return `${index + 1}. ${product} — পরিমাণ: ${quantity}`;
    });
    payload['অর্ডার করা পণ্য'] = orderDetails.join('\n');
    payload._subject = `নতুন অর্ডার — ${orderDetails.map((line) => line.replace(/^\d+\. /, '')).join(', ')}`;
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
      renderProductRows(1, '64 Pages IQRA Intelligence Book');
      status.textContent = '';
      delete status.dataset.state;
      if (orderConfirmation?.showModal) {
        orderConfirmation.showModal();
      } else {
        status.textContent = 'ধন্যবাদ! আপনার অর্ডারটি সফলভাবে জমা হয়েছে। আমরা শীঘ্রই ফোনে যোগাযোগ করব।';
        status.dataset.state = 'success';
      }
    } catch {
      status.textContent = 'অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন অথবা ফোনে যোগাযোগ করুন।';
      status.dataset.state = 'error';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
