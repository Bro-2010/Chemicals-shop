// Area Man Chemicals - front end

// WhatsApp number in international form: 233 + number without the first 0
var WHATSAPP_NUMBER = "233542931782";
var SHOP_NAME = "Area Man Chemicals";

function whatsappLink(text) {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ----- Make every WhatsApp button work -----
document.querySelectorAll("[data-wa]").forEach(function (link) {
  link.href = whatsappLink("Hello " + SHOP_NAME + ", I want to make an order.");
  link.target = "_blank";
  link.rel = "noopener";
});

// ----- Products -----
var allProducts = [];
var currentFilter = "All";
var productList = document.getElementById("productList");

function showProducts() {
  var shown = allProducts.filter(function (p) {
    return currentFilter === "All" || p.category === currentFilter;
  });

  if (shown.length === 0) {
    productList.innerHTML = '<p class="muted">No products to show.</p>';
    return;
  }

  productList.innerHTML = shown.map(function (p) {
    var type = p.category === "Chemicals" ? "chem" : "health";
    return (
      '<article class="card ' + type + '">' +
        '<span class="tag">' + escapeHtml(p.category) + '</span>' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        '<p>' + escapeHtml(p.description || "") + '</p>' +
        '<button class="btn outline" data-add="' + escapeHtml(p.name) + '">Add to order</button>' +
      '</article>'
    );
  }).join("");
}

function loadProducts() {
  fetch("/api/products")
    .then(function (response) {
      if (!response.ok) throw new Error("Could not load products");
      return response.json();
    })
    .then(function (list) {
      allProducts = list;
      showProducts();
    })
    .catch(function () {
      productList.innerHTML =
        '<p class="muted">We could not load the products now. Please send us a message on WhatsApp.</p>';
    });
}

document.getElementById("filters").addEventListener("click", function (event) {
  var button = event.target.closest("button");
  if (!button) return;
  currentFilter = button.getAttribute("data-filter");
  document.querySelectorAll("#filters button").forEach(function (b) {
    b.classList.toggle("active", b === button);
  });
  showProducts();
});

productList.addEventListener("click", function (event) {
  var button = event.target.closest("button[data-add]");
  if (!button) return;

  var items = document.getElementById("items");
  var line = "- " + button.getAttribute("data-add") + ": ";
  items.value = items.value ? items.value.replace(/\s*$/, "\n") + line : line;

  button.textContent = "Added";
  setTimeout(function () { button.textContent = "Add to order"; }, 1500);

  document.getElementById("order").scrollIntoView();
  items.focus();
});

// ----- Order form -----
var form = document.getElementById("orderForm");
var message = document.getElementById("formMessage");
var sendBtn = document.getElementById("sendBtn");
var serviceSelect = document.getElementById("service");
var addressLabel = document.getElementById("addressLabel");

serviceSelect.addEventListener("change", function () {
  addressLabel.style.display = serviceSelect.value === "Delivery" ? "block" : "none";
});

function showMessage(html, good) {
  message.className = "form-message " + (good ? "good" : "bad");
  message.innerHTML = html;
}

function orderText(data) {
  var text = "Hello " + SHOP_NAME + ", I want to order.\n\n" +
    "Name: " + data.name + "\n" +
    "Phone: " + data.phone + "\n" +
    "Service: " + data.service + "\n";
  if (data.service === "Delivery") text += "Address: " + data.address + "\n";
  text += "\nItems:\n" + data.items;
  if (data.note) text += "\n\nNote: " + data.note;
  return text;
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  var data = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    service: serviceSelect.value,
    address: document.getElementById("address").value.trim(),
    items: document.getElementById("items").value.trim(),
    note: document.getElementById("note").value.trim(),
    website: document.getElementById("website").value
  };

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";
  message.textContent = "";

  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body };
      });
    })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Something went wrong.");

      showMessage(
        "Thank you, " + escapeHtml(data.name) + "! We got your order. We will contact you soon." +
        '<br><a class="btn whatsapp" target="_blank" rel="noopener" href="' +
        whatsappLink(orderText(data)) + '">Also send it on WhatsApp</a>',
        true
      );
      form.reset();
      addressLabel.style.display = "block";
    })
    .catch(function (error) {
      var text = error instanceof TypeError
        ? "We could not reach the server."
        : escapeHtml(error.message);
      showMessage(
        text + " You can send your order on WhatsApp instead." +
        '<br><a class="btn whatsapp" target="_blank" rel="noopener" href="' +
        whatsappLink(orderText(data)) + '">Order on WhatsApp</a>',
        false
      );
    })
    .then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send order";
    });
});

loadProducts();
