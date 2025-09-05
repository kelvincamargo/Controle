const form = document.getElementById("tool-form");
const requestsDiv = document.getElementById("requests");
const searchInput = document.getElementById("search");
const dateInput = document.getElementById("date");
const personInput = document.getElementById("person");
const builderInput = document.getElementById("builderNumber");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

let pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const person = personInput.value.trim();
  const builderNumber = builderInput.value.trim(); // agora opcional
  const tool = document.getElementById("tool").value;
  const quantity = parseInt(document.getElementById("quantity").value);
  const date = dateInput.value;

  // procura pedido já existente (mesma pessoa, builder e data)
  let pedido = pedidos.find(
    p => p.person === person && p.builderNumber === builderNumber && p.date === date
  );

  if (!pedido) {
    pedido = { id: Date.now(), person, builderNumber, date, tools: [] };
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
    const nome = pedido.person.toLowerCase();
    const builder = (pedido.builderNumber || "").toLowerCase();

    // pesquisa por nome OU builder (se existir)
    if (!nome.includes(filter) && !builder.includes(filter)) return;

    const div = document.createElement("div");
    div.innerHTML = `
      <h3>
        ${pedido.person}
        ${pedido.builderNumber ? `(Builder Nº ${pedido.builderNumber})` : ""}
        - ${pedido.date}
      </h3>
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
  const resumo = {};

  pedidos.forEach(pedido => {
    pedido.tools.forEach(item => {
      const nome = item.tool;
      if (!resumo[nome]) {
        resumo[nome] = { total: 0, devolvido: 0 };
      }
      resumo[nome].total += item.quantity;
      resumo[nome].devolvido += item.returned;
    });
  });

  let csv = "Ferramenta,Total Retirado,Total Devolvido,Em Aberto,% Devolvido\n";

  for (const [tool, data] of Object.entries(resumo)) {
    const emAberto = data.total - data.devolvido;
    const percentual = data.total > 0 ? ((data.devolvido / data.total) * 100).toFixed(2) + "%" : "0%";
    csv += `${tool},${data.total},${data.devolvido},${emAberto},${percentual}\n`;
  }

  const BOM = "\uFEFF"; // Suporte UTF-8 no Excel
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resumo_ferramentas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

render();
