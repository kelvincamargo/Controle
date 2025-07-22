const form = document.getElementById("tool-form");
const requestsDiv = document.getElementById("requests");
const searchInput = document.getElementById("search");
const dateInput = document.getElementById("date");
const personInput = document.getElementById("person");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

let pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const person = personInput.value;
  const tool = document.getElementById("tool").value;
  const quantity = parseInt(document.getElementById("quantity").value);
  const date = dateInput.value;

  let pedido = pedidos.find(p => p.person === person && p.date === date);

  if (!pedido) {
    pedido = { id: Date.now(), person, date, tools: [] };
    pedidos.push(pedido);
  }

  pedido.tools.push({ tool, quantity, returned: 0 });

  localStorage.setItem("pedidos", JSON.stringify(pedidos));

  document.getElementById("tool").value = "";
  document.getElementById("quantity").value = "";

  render();
});

searchInput.addEventListener("input", render);

function render() {
  const filter = searchInput.value.toLowerCase();
  requestsDiv.innerHTML = "";

  pedidos.forEach(pedido => {
    if (!pedido.person.toLowerCase().includes(filter)) return;

    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${pedido.person} - ${pedido.date}</h3>
      <ul>
        ${pedido.tools.map((item, i) => `
          <li>
            ${item.tool} - ${item.quantity} unidades
            <br>
            Devolver:
            <input type="number" min="0" max="${item.quantity - item.returned}" value="0" id="ret-${pedido.id}-${i}">
            <button onclick="devolver(${pedido.id}, ${i})">Confirmar Devolução</button>
            <br>Devolvido: ${item.returned}
          </li>
        `).join("")}
      </ul>
      <hr>
    `;
    requestsDiv.appendChild(div);
  });
}

function devolver(id, index) {
  const pedido = pedidos.find(p => p.id === id);
  const item = pedido.tools[index];
  const input = document.getElementById(`ret-${id}-${index}`);
  const devolucao = parseInt(input.value);

  if (devolucao > 0 && item.returned + devolucao <= item.quantity) {
    item.returned += devolucao;

    const tudoDevolvido = pedido.tools.every(t => t.returned >= t.quantity);
    if (tudoDevolvido) {
      pedidos = pedidos.filter(p => p.id !== id);
    }

    localStorage.setItem("pedidos", JSON.stringify(pedidos));
    render();
  } else {
    alert("Valor inválido para devolução.");
  }
}

// Exportar dados para Excel
function exportarExcel() {
  let linhas = [["Nome", "Data", "Ferramenta", "Quantidade", "Devolvido"]];
  pedidos.forEach(p => {
    p.tools.forEach(t => {
      linhas.push([p.person, p.date, t.tool, t.quantity, t.returned]);
    });
  });

  let csv = linhas.map(l => l.join(";")).join("\\n");
  let blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "controle_ferramentas.csv";
  a.click();
}

render();
