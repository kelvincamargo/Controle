const form = document.getElementById("tool-form");
const requestsDiv = document.getElementById("requests");
const searchInput = document.getElementById("search");

const dateInput = document.getElementById("date");
const personInput = document.getElementById("person");
const builderInput = document.getElementById("builderNumber");
const observationInput = document.getElementById("observation");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

let pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];
let historico = [];

function salvarEstado() {
  historico.push(JSON.stringify(pedidos));

  if (historico.length > 20) {
    historico.shift();
  }
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  salvarEstado();

  const person = personInput.value.trim();
  const builderNumber = builderInput.value.trim();
  const tool = document.getElementById("tool").value.trim();
  const quantity = parseInt(document.getElementById("quantity").value);
  const date = dateInput.value;
  const observation = observationInput.value.trim();

  let pedido = pedidos.find(
    p =>
      p.person === person &&
      p.builderNumber === builderNumber &&
      p.date === date
  );

  if (!pedido) {
    pedido = {
      id: Date.now(),
      person,
      builderNumber,
      date,
      observation,
      tools: []
    };

    pedidos.push(pedido);
  } else {
    pedido.observation = observation;
  }

  pedido.tools.push({
    tool,
    quantity,
    returned: 0
  });

  salvarPedidos();

  form.reset();
  dateInput.value = today;

  render();
});

searchInput.addEventListener("input", render);

function salvarPedidos() {
  localStorage.setItem("pedidos", JSON.stringify(pedidos));
}

function render() {
  const filter = searchInput.value.toLowerCase();

  requestsDiv.innerHTML = "";

  const pedidosOrdenados = [...pedidos].sort((a, b) =>
    a.person.localeCompare(b.person, "pt-BR")
  );

  pedidosOrdenados.forEach(pedido => {
    const nome = pedido.person.toLowerCase();
    const builder = (pedido.builderNumber || "").toLowerCase();

    if (!nome.includes(filter) && !builder.includes(filter)) return;

    const div = document.createElement("div");
    div.classList.add("pedido-card");

    div.innerHTML = `
      <div class="pedido-header">
        <h3>
          ${pedido.person}
          ${pedido.builderNumber ? `(Builder Nº ${pedido.builderNumber})` : ""}
          - ${pedido.date}
        </h3>

        <div class="acoes">
          <button onclick="editarPedido(${pedido.id})">Editar</button>
          <button onclick="removerPedido(${pedido.id})">Excluir</button>
        </div>
      </div>

      <p><strong>Observações:</strong> ${pedido.observation || "Nenhuma"}</p>

      <ul>
        ${pedido.tools.map((item, i) => `
          <li>
            <strong>${item.tool}</strong><br>
            Quantidade: ${item.quantity}<br>
            Devolvido: ${item.returned}<br><br>

            <input
              type="number"
              min="0"
              max="${item.quantity - item.returned}"
              value="0"
              id="ret-${pedido.id}-${i}"
            >

            <button onclick="devolver(${pedido.id}, ${i})">
              Confirmar Devolução
            </button>
          </li>
        `).join("")}
      </ul>
    `;

    requestsDiv.appendChild(div);
  });
}

function devolver(id, index) {
  const pedido = pedidos.find(p => p.id === id);

  if (!pedido) return;

  const item = pedido.tools[index];
  const input = document.getElementById(`ret-${id}-${index}`);

  const devolucao = parseInt(input.value);

  if (
    devolucao > 0 &&
    item.returned + devolucao <= item.quantity
  ) {
    salvarEstado();

    item.returned += devolucao;

    salvarPedidos();
    render();
  } else {
    alert("Valor inválido para devolução.");
  }
}

function editarPedido(id) {
  const pedido = pedidos.find(p => p.id === id);

  if (!pedido) return;

  salvarEstado();

  const novoNome = prompt("Editar nome:", pedido.person);

  if (novoNome !== null) {
    pedido.person = novoNome;
  }

  const novoBuilder = prompt(
    "Editar Nº Builder:",
    pedido.builderNumber || ""
  );

  if (novoBuilder !== null) {
    pedido.builderNumber = novoBuilder;
  }

  const novaObs = prompt(
    "Editar observações:",
    pedido.observation || ""
  );

  if (novaObs !== null) {
    pedido.observation = novaObs;
  }

  // EDITAR FERRAMENTAS
  pedido.tools.forEach((item) => {

    const novaFerramenta = prompt(
      `Editar ferramenta (${item.tool}):`,
      item.tool
    );

    if (novaFerramenta !== null) {
      item.tool = novaFerramenta;
    }

    const novaQuantidade = prompt(
      `Editar quantidade da ferramenta ${item.tool}:`,
      item.quantity
    );

    if (
      novaQuantidade !== null &&
      !isNaN(novaQuantidade) &&
      parseInt(novaQuantidade) > 0
    ) {
      item.quantity = parseInt(novaQuantidade);

      // impede devolvido maior que quantidade
      if (item.returned > item.quantity) {
        item.returned = item.quantity;
      }
    }
  });

  salvarPedidos();
  render();
}

function removerPedido(id) {
  const confirmar = confirm("Deseja realmente excluir este pedido?");

  if (!confirmar) return;

  salvarEstado();

  pedidos = pedidos.filter(p => p.id !== id);

  salvarPedidos();
  render();
}

function desfazerUltimaAcao() {
  if (historico.length === 0) {
    alert("Nenhuma ação para desfazer.");
    return;
  }

  pedidos = JSON.parse(historico.pop());

  salvarPedidos();
  render();
}

async function exportarPDFCompleto() {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // ORDENA POR NOME
  const pedidosOrdenados = [...pedidos].sort((a, b) =>
    a.person.localeCompare(b.person, "pt-BR")
  );

  let corpoTabela = [];

  pedidosOrdenados.forEach(pedido => {

    // LINHA DO NOME
    corpoTabela.push([
      {
        content:
          `${pedido.person} ${
            pedido.builderNumber
              ? "(Builder Nº " + pedido.builderNumber + ")"
              : ""
          }`,
        colSpan: 6,
        styles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          halign: "left"
        }
      }
    ]);

    // FERRAMENTAS
    pedido.tools.forEach(item => {

      const status =
        item.returned >= item.quantity
          ? "Devolvido"
          : `Pendente (${item.quantity - item.returned})`;

      corpoTabela.push([
        item.tool,
        item.quantity,
        item.returned,
        item.quantity - item.returned,
        status,
        pedido.observation || "-"
      ]);
    });

  });

  doc.setFontSize(18);
  doc.text("Relatório Geral de Ferramentas", 14, 20);

  doc.autoTable({
    startY: 30,

    head: [[
      "Ferramenta",
      "Qtd",
      "Devolvido",
      "Em Aberto",
      "Status",
      "Observações"
    ]],

    body: corpoTabela,

    styles: {
      fontSize: 10,
      cellPadding: 3,
      valign: "middle"
    },

    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      halign: "center"
    },

    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },

    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 30 },
      5: { cellWidth: 45 }
    }
  });

  doc.save("Relatorio_Ferramentas.pdf");
}
render();
