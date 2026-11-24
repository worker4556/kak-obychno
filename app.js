const restaurants = [
  { id: "tverskaya", address: "Тверская, 17", classic: 159, bbq: 219, fries: 109, cola: 99 },
  { id: "arbat", address: "Арбат, 15", classic: 169, bbq: null, fries: 109, cola: 109 },
  { id: "baumanskaya", address: "Бауманская, 35/1", classic: 169, bbq: 239, fries: 119, cola: 99 },
];
const itemNames = {
  classic: "Чизбургер",
  bbq: "Бургер BBQ",
  fries: "Картофель фри",
  cola: "Кола",
};
const sides = ["fries", "cola"];

const byId = (id) => document.getElementById(id);
const prices = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const rubles = (value) => prices.format(value) + "\u00a0₽";
const storageKey = "usual-order-demo-v1";
const cartDialog = byId("cart-dialog");
const locationDialog = byId("location-dialog");
const saved = readState();
let selectedRestaurant = restaurants.find(({ id }) => id === saved.location) ?? restaurants[0];
let cart = ["classic", "bbq", "sides"].includes(saved.cart) ? saved.cart : null;
if (cart === "bbq" && selectedRestaurant.bbq === null) cart = "sides";
let preview = "classic";
let confirmation = null;

function readState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ location: selectedRestaurant.id, cart }));
  } catch {
    // The demo remains usable in private or restricted browser sessions.
  }
}

function orderItems(variant) {
  return variant === "sides" ? sides : [variant, ...sides];
}

function total(variant) {
  return orderItems(variant).reduce((sum, item) => sum + selectedRestaurant[item], 0);
}

function partialCartMessage() {
  return selectedRestaurant.bbq === null
    ? "В этом ресторане Бургер BBQ закончился. Фри и кола в корзине."
    : "Фри и кола в корзине. Бургер можно добавить заново.";
}

function delta() {
  const difference = selectedRestaurant.bbq - selectedRestaurant.classic;
  return (difference < 0 ? "−" : "+") + rubles(Math.abs(difference));
}

function announce(message) {
  byId("status").textContent = message;
}

function refreshMenu() {
  const available = selectedRestaurant.bbq !== null;
  const swapped = preview === "bbq";
  byId("selected-location").textContent = selectedRestaurant.address;
  byId("order-ticket").dataset.variant = preview;
  byId("main-item").textContent = itemNames[preview];
  byId("main-price").textContent = rubles(selectedRestaurant[preview]);
  byId("item-detail").hidden = !swapped;
  byId("fries-price").textContent = rubles(selectedRestaurant.fries);
  byId("cola-price").textContent = rubles(selectedRestaurant.cola);

  const repeat = byId("repeat-order");
  repeat.querySelector("span").textContent = swapped ? "В корзину с новинкой" : "Повторить заказ";
  byId("repeat-price").textContent = rubles(total(preview));

  const swap = byId("swap-order");
  swap.hidden = !available;
  swap.querySelector("span").textContent = swapped ? "Вернуть чизбургер" : "Заменить";
  byId("swap-price").textContent = available && !swapped ? delta() : "";
  byId("swap-offer").dataset.state = available ? (swapped ? "applied" : "available") : "unavailable";
  byId("offer-title").textContent = swapped ? "Замена выбрана" : "Новинка · Бургер BBQ";
  byId("swap-info").textContent = !available ? "Закончился в этом ресторане."
    : swapped ? "Фри и кола остались · " + delta() + " к заказу"
      : "Вместо чизбургера · тоже с говядиной.";

  const cartCount = byId("cart-count");
  cartCount.hidden = cart === null;
  cartCount.textContent = cart ? orderItems(cart).length : "";

  const notice = byId("location-notice");
  notice.hidden = cart !== "sides";
  notice.textContent = cart === "sides" ? partialCartMessage() : "";
}

function togglePreview() {
  if (selectedRestaurant.bbq === null) return;
  preview = preview === "classic" ? "bbq" : "classic";
  refreshMenu();
  announce(byId("main-item").textContent + ". Сумма заказа " + rubles(total(preview)) + ".");
}

function openCart() {
  renderCart();
  if (!cartDialog.open) cartDialog.showModal();
}

function addOrder(variant) {
  if (variant === "bbq" && selectedRestaurant.bbq === null) return;
  cart = variant;
  preview = variant;
  confirmation = null;
  saveState();
  refreshMenu();
  openCart();
  announce("Заказ добавлен в корзину");
}

function element(tag, content = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = content;
  node.className = className;
  return node;
}

function button(label, className, click) {
  const control = element("button", label, className);
  control.type = "button";
  control.addEventListener("click", click);
  return control;
}

function cartLine(title, price, detail) {
  const row = element("li");
  const name = element("span", title);
  if (detail) name.append(element("small", detail));
  row.append(name, element("strong", rubles(price)));
  return row;
}

function renderCart() {
  const body = byId("cart-body");
  const title = byId("cart-title");
  body.replaceChildren();
  if (confirmation) {
    title.textContent = "Демо-заказ оформлен";
    const panel = element("div", "", "confirmation");
    const mark = element("span", "", "success-mark");
    mark.innerHTML = '<svg aria-hidden="true"><use href="#check"/></svg>';
    panel.append(mark, element("p", confirmation),
      button("На главный экран", "action primary", () => cartDialog.close()));
    body.append(panel);
    return;
  }
  title.textContent = "Корзина";
  if (!cart) {
    body.append(element("p", "Выберите привычный заказ или заказ с новинкой.", "cart-address"),
      button("К заказу", "text-button", () => cartDialog.close()));
    return;
  }
  const items = element("ul", "", "cart-items");
  const isSwap = cart === "bbq";
  for (const item of orderItems(cart)) {
    items.append(cartLine(itemNames[item], selectedRestaurant[item], item === "bbq" ? "Вместо чизбургера" : ""));
  }
  body.append(element("p", "Самовывоз · " + selectedRestaurant.address, "cart-address"), items);
  if (cart === "sides") {
    body.append(element("p", partialCartMessage(), "cart-note"));
  } else if (isSwap) {
    body.append(element("p", "Фри и кола остались в заказе. Разница " + delta() + ".", "cart-note"));
  }
  const changeVariant = (variant) => {
    addOrder(variant);
    (body.querySelector(".text-button") ?? body.querySelector(".primary")).focus();
  };
  if (cart === "sides") {
    body.append(button("Добавить чизбургер · " + rubles(selectedRestaurant.classic),
      "text-button", () => changeVariant("classic")));
    if (selectedRestaurant.bbq !== null) {
      body.append(button("Добавить Бургер BBQ · " + rubles(selectedRestaurant.bbq),
        "text-button", () => changeVariant("bbq")));
    }
  } else if (selectedRestaurant.bbq !== null) {
    body.append(button(isSwap ? "Вернуть чизбургер" : "Заменить на Бургер BBQ · " + delta(),
      "text-button", () => changeVariant(isSwap ? "classic" : "bbq")));
  }
  const confirm = button("Оформить демо-заказ", "action primary", () => {
    confirmation = "Самовывоз · " + selectedRestaurant.address + ". Сумма заказа " + rubles(total(cart)) + ".";
    cart = null;
    preview = "classic";
    saveState();
    refreshMenu();
    renderCart();
    body.querySelector("button").focus();
    announce("Демо-заказ оформлен");
  });
  confirm.append(element("strong", rubles(total(cart))));
  body.append(confirm, element("p", "Демонстрация без оплаты и отправки заказа.", "demo-note"));
}

function selectLocation() {
  const list = byId("locations");
  list.replaceChildren();
  for (const restaurant of restaurants) {
    const option = element("label", "", "restaurant");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "restaurant";
    radio.value = restaurant.id;
    radio.checked = restaurant.id === selectedRestaurant.id;
    const copy = element("span");
    copy.append(element("strong", restaurant.address), element("small",
      restaurant.bbq === null ? "Бургер BBQ закончился" : "Привычный заказ и новинка доступны"));
    option.append(radio, copy);
    list.append(option);
  }
  locationDialog.showModal();
}

byId("location-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const next = new FormData(event.currentTarget).get("restaurant");
  selectedRestaurant = restaurants.find(({ id }) => id === next) ?? selectedRestaurant;
  confirmation = null;
  let message = "Выбран ресторан " + selectedRestaurant.address;
  if (selectedRestaurant.bbq === null) {
    if (preview === "bbq") preview = "classic";
    if (cart === "bbq") {
      cart = "sides";
      message += ". Бургер BBQ закончился. Фри и кола в корзине.";
    }
  }
  saveState();
  refreshMenu();
  locationDialog.close();
  announce(message);
});
byId("location").addEventListener("click", selectLocation);
byId("repeat-order").addEventListener("click", () => addOrder(preview));
byId("swap-order").addEventListener("click", togglePreview);
byId("open-cart").addEventListener("click", () => {
  confirmation = null;
  openCart();
});
for (const control of document.querySelectorAll("[data-close]")) {
  control.addEventListener("click", () => control.closest("dialog").close());
}
refreshMenu();
