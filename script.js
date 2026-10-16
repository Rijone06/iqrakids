// Keep the home page URL clean when it is opened directly as index.html.
if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.slice(0, -'index.html'.length);
  window.history.replaceState(window.history.state, '', `${cleanPath}${window.location.search}${window.location.hash}`);
}

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
const orderConfirmation = document.querySelector('#order-confirmation');

if (orderForm) {
  const cartItemsElement = orderForm.querySelector('#order-items');
  const cartEmptyMessage = orderForm.querySelector('#order-cart-empty');
  const picker = orderForm.querySelector('#product-picker');
  const pickerItems = orderForm.querySelector('#product-picker-items');
  const pickerEmptyMessage = orderForm.querySelector('#product-picker-empty');
  const searchInput = orderForm.querySelector('#product-search');
  const pickerToggle = orderForm.querySelector('#open-product-picker');
  const subtotalElement = orderForm.querySelector('#order-subtotal');
  const deliveryElement = orderForm.querySelector('#order-delivery');
  const totalElement = orderForm.querySelector('#order-total');
  const status = orderForm.querySelector('#order-status');
  const submitButton = orderForm.querySelector('.order-form__submit');
  const recipient = orderForm.dataset.emailRecipient?.trim();
  const digits = new Map([['০', '0'], ['১', '1'], ['২', '2'], ['৩', '3'], ['৪', '4'], ['৫', '5'], ['৬', '6'], ['৭', '7'], ['৮', '8'], ['৯', '9']]);
  const toEnglishDigits = (value) => String(value).replace(/[০-৯]/g, (digit) => digits.get(digit));
  const formatMoney = (amount) => `৳ ${new Intl.NumberFormat('bn-BD').format(amount)}`;
  const catalog = new Map();
  const cart = new Map();
  let isSubmitting = false;

  document.querySelectorAll('[data-product-id][data-price]').forEach((card) => {
    const id = card.dataset.productId;
    const name = card.querySelector('.combo-card__body h3, .product-card__body h3')?.textContent.trim();
    const image = card.querySelector('.combo-card__image');
    const price = Number(toEnglishDigits(card.dataset.price));
    if (!id || !name || !image || !Number.isSafeInteger(price) || price < 0) return;
    catalog.set(id, {
      id,
      name,
      price,
      image: image.getAttribute('src'),
      alt: image.alt || name,
      delivery: card.dataset.delivery === 'free' ? 'free' : 'address-based'
    });
  });

  const setPickerOpen = (isOpen) => {
    picker.hidden = !isOpen;
    pickerToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) searchInput.focus();
  };

  const renderPicker = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    pickerItems.replaceChildren();
    let visibleCount = 0;

    catalog.forEach((product) => {
      if (!product.name.toLocaleLowerCase().includes(query)) return;
      visibleCount += 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-picker__item';
      button.dataset.addProductId = product.id;
      button.disabled = cart.has(product.id);
      button.setAttribute('aria-label', `${product.name}, ${formatMoney(product.price)}${button.disabled ? ', ইতিমধ্যে যুক্ত' : ', অর্ডারে যোগ করুন'}`);

      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.alt;
      image.loading = 'lazy';
      const details = document.createElement('span');
      details.className = 'product-picker__details';
      const name = document.createElement('strong');
      name.textContent = product.name;
      const price = document.createElement('small');
      price.textContent = formatMoney(product.price);
      const action = document.createElement('span');
      action.className = 'product-picker__action';
      action.textContent = button.disabled ? 'যুক্ত হয়েছে' : '+ যোগ করুন';
      details.append(name, price);
      button.append(image, details, action);
      pickerItems.append(button);
    });

    pickerEmptyMessage.hidden = visibleCount > 0;
  };

  const updateSummary = () => {
    let subtotal = 0;
    cart.forEach((item) => { subtotal += item.product.price * item.quantity; });
    const hasItems = cart.size > 0;
    const freeDelivery = hasItems && Array.from(cart.values()).every((item) => item.product.delivery === 'free');
    subtotalElement.textContent = formatMoney(subtotal);
    deliveryElement.textContent = freeDelivery ? 'বিনামূল্যে' : 'ঠিকানা অনুযায়ী নিশ্চিত করা হবে';
    totalElement.textContent = freeDelivery ? formatMoney(subtotal) : `${formatMoney(subtotal)} + ডেলিভারি চার্জ`;
    return { subtotal, freeDelivery };
  };

  const renderCart = () => {
    cartItemsElement.replaceChildren();
    cartEmptyMessage.hidden = cart.size > 0;

    cart.forEach((item, id) => {
      const lineTotal = item.product.price * item.quantity;
      const article = document.createElement('article');
      article.className = 'order-cart-item';
      article.setAttribute('aria-label', item.product.name);

      const image = document.createElement('img');
      image.className = 'order-cart-item__image';
      image.src = item.product.image;
      image.alt = item.product.alt;
      image.loading = 'lazy';

      const details = document.createElement('div');
      details.className = 'order-cart-item__details';
      const name = document.createElement('h4');
      name.textContent = item.product.name;
      const unitPrice = document.createElement('p');
      unitPrice.textContent = `${formatMoney(item.product.price)} / পিস`;
      const linePrice = document.createElement('strong');
      linePrice.className = 'order-cart-item__line-price';
      linePrice.textContent = formatMoney(lineTotal);
      details.append(name, unitPrice, linePrice);

      const actions = document.createElement('div');
      actions.className = 'order-cart-item__actions';
      const quantityLabel = document.createElement('span');
      quantityLabel.className = 'sr-only';
      quantityLabel.textContent = `${item.product.name}-এর পরিমাণ`;
      const quantityControl = document.createElement('div');
      quantityControl.className = 'quantity-control order-cart-item__quantity';
      quantityControl.setAttribute('role', 'group');
      quantityControl.setAttribute('aria-label', quantityLabel.textContent);
      const decrease = document.createElement('button');
      decrease.type = 'button';
      decrease.className = 'quantity-control__button';
      decrease.dataset.cartQuantityStep = '-1';
      decrease.dataset.productId = id;
      decrease.setAttribute('aria-label', `${item.product.name} পরিমাণ কমান`);
      decrease.textContent = '−';
      const quantity = document.createElement('output');
      quantity.className = 'quantity-control__value';
      quantity.textContent = new Intl.NumberFormat('bn-BD').format(item.quantity);
      const increase = document.createElement('button');
      increase.type = 'button';
      increase.className = 'quantity-control__button';
      increase.dataset.cartQuantityStep = '1';
      increase.dataset.productId = id;
      increase.setAttribute('aria-label', `${item.product.name} পরিমাণ বাড়ান`);
      increase.textContent = '+';
      quantityControl.append(decrease, quantity, increase);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'order-cart-item__remove';
      remove.dataset.removeProductId = id;
      remove.textContent = 'সরিয়ে দিন';
      actions.append(quantityLabel, quantityControl, remove);

      article.append(image, details, actions);
      cartItemsElement.append(article);
    });

    updateSummary();
    if (!picker.hidden) renderPicker();
  };

  const addProduct = (id) => {
    const product = catalog.get(id);
    if (!product || cart.has(id)) return false;
    cart.set(id, { product, quantity: 1 });
    status.textContent = '';
    delete status.dataset.state;
    renderCart();
    return true;
  };

  document.querySelectorAll('[data-order-product-id]').forEach((button) => {
    button.addEventListener('click', () => addProduct(button.dataset.orderProductId));
  });

  pickerToggle.addEventListener('click', () => setPickerOpen(picker.hidden));
  orderForm.querySelector('#close-product-picker').addEventListener('click', () => {
    setPickerOpen(false);
    pickerToggle.focus();
  });
  searchInput.addEventListener('input', renderPicker);
  pickerItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-product-id]');
    if (button && addProduct(button.dataset.addProductId)) {
      const nextAvailable = pickerItems.querySelector('.product-picker__item:not(:disabled)');
      (nextAvailable || orderForm.querySelector('#close-product-picker')).focus();
    }
  });

  cartItemsElement.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-product-id]');
    if (removeButton) {
      cart.delete(removeButton.dataset.removeProductId);
      status.textContent = '';
      delete status.dataset.state;
      renderCart();
      const nextRemoveButton = cartItemsElement.querySelector('[data-remove-product-id]');
      (nextRemoveButton || pickerToggle).focus();
      return;
    }
    const quantityButton = event.target.closest('[data-cart-quantity-step]');
    if (!quantityButton) return;
    const item = cart.get(quantityButton.dataset.productId);
    if (!item) return;
    const productId = quantityButton.dataset.productId;
    const step = quantityButton.dataset.cartQuantityStep;
    item.quantity = Math.min(99, Math.max(1, item.quantity + Number(step)));
    renderCart();
    const updatedButton = Array.from(cartItemsElement.querySelectorAll('[data-cart-quantity-step]'))
      .find((candidate) => candidate.dataset.productId === productId && candidate.dataset.cartQuantityStep === step);
    updatedButton?.focus();
  });

  renderCart();
  renderPicker();

  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (cart.size === 0) {
      status.textContent = 'অর্ডার জমা দিতে অন্তত একটি পণ্য নির্বাচন করুন।';
      status.dataset.state = 'error';
      setPickerOpen(true);
      return;
    }
    if (!orderForm.reportValidity()) return;
    if (!recipient) return;

    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());
    const items = Array.from(cart.values(), ({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      quantity,
      unit_price_bdt: product.price,
      line_total_bdt: product.price * quantity
    }));
    const subtotal = items.reduce((sum, item) => sum + item.line_total_bdt, 0);
    const freeDelivery = Array.from(cart.values()).every((item) => item.product.delivery === 'free');
    payload.order_items = JSON.stringify(items, null, 2);
    payload.product_subtotal_bdt = subtotal;
    payload.delivery_charge_bdt = freeDelivery ? 0 : 'ঠিকানা অনুযায়ী নিশ্চিত করা হবে';
    payload.order_total_bdt = freeDelivery ? subtotal : `${subtotal} + ডেলিভারি চার্জ নিশ্চিত করা হবে`;
    payload._subject = `নতুন অর্ডার — ${items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}`;
    payload._template = 'table';

    isSubmitting = true;
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
      cart.clear();
      setPickerOpen(false);
      renderCart();
      status.textContent = '';
      delete status.dataset.state;
      if (orderConfirmation?.showModal) {
        orderConfirmation.showModal();
      } else {
        status.textContent = 'ধন্যবাদ! আপনার অর্ডারটি সফলভাবে জমা হয়েছে। আমরা শীঘ্রই ফোনে যোগাযোগ করব।';
        status.dataset.state = 'success';
      }
    } catch {
      status.textContent = 'অর্ডার পাঠানো যায়নি। আপনার তথ্য সংরক্ষিত আছে—আবার চেষ্টা করুন অথবা ফোনে যোগাযোগ করুন।';
      status.dataset.state = 'error';
    } finally {
      isSubmitting = false;
      if (submitButton) submitButton.disabled = false;
    }
  });
}
