<script setup>
import { computed } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "vue-chartjs";

// Enregistrer les composants Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement
);

// Props
const props = defineProps({
  salesData: {
    type: Array,
    default: () => [],
  },
  chartType: {
    type: String,
    default: "bar",
  },
  period: {
    type: String,
    default: "month",
  },
});

// Computed pour préparer les données du graphique
const chartData = computed(() => {
  if (!props.salesData || props.salesData.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Grouper les ventes par période
  const salesByPeriod = {};

  props.salesData.forEach((sale) => {
    const saleDate = new Date(sale.date);
    let periodKey;

    switch (props.period) {
      case "today":
        periodKey = saleDate.getHours() + "h";
        break;
      case "week": {
        const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        periodKey = days[saleDate.getDay()];
        break;
      }
      case "month":
        periodKey = saleDate.getDate();
        break;
      case "quarter":
      case "year": {
        const months = [
          "Jan",
          "Fév",
          "Mar",
          "Avr",
          "Mai",
          "Jun",
          "Jul",
          "Aoû",
          "Sep",
          "Oct",
          "Nov",
          "Déc",
        ];
        periodKey = months[saleDate.getMonth()];
        break;
      }
      default:
        periodKey = saleDate.getFullYear();
    }

    if (!salesByPeriod[periodKey]) {
      salesByPeriod[periodKey] = {
        total: 0,
        count: 0,
        quantity: 0,
      };
    }

    salesByPeriod[periodKey].total += parseFloat(sale.total) || 0;
    salesByPeriod[periodKey].count += 1;

    if (sale.invoice_items) {
      sale.invoice_items.forEach((item) => {
        salesByPeriod[periodKey].quantity += parseInt(item.quantity) || 0;
      });
    }
  });

  const labels = Object.keys(salesByPeriod).sort();
  const totals = labels.map((label) => salesByPeriod[label].total);
  const counts = labels.map((label) => salesByPeriod[label].count);

  if (props.chartType === "doughnut") {
    // Pour le diagramme en secteurs, utiliser les top 5 produits
    return {
      labels: labels.slice(0, 5),
      datasets: [
        {
          data: totals.slice(0, 5),
          backgroundColor: [
            "#3B82F6", // Blue
            "#10B981", // Green
            "#8B5CF6", // Purple
            "#F59E0B", // Orange
            "#EF4444", // Red
          ],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }

  return {
    labels,
    datasets: [
      {
        label: "Chiffre d'Affaires",
        data: totals,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: "Nombre de Ventes",
        data: counts,
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2,
        yAxisID: "y1",
        tension: 0.4,
      },
    ],
  };
});

// Options du graphique
const chartOptions = computed(() => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Évolution des Ventes - ${getPeriodLabel()}`,
        font: {
          size: 16,
          weight: "bold",
        },
      },
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y || context.parsed;

            if (label.includes("Chiffre d'Affaires")) {
              return `${label}: ${(value)}`;
            }
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  if (props.chartType === "doughnut") {
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          ...baseOptions.plugins.title,
          text: "Répartition du Chiffre d'Affaires",
        },
        legend: {
          display: true,
          position: "right",
        },
      },
    };
  }

  return {
    ...baseOptions,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: getPeriodLabel(),
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Chiffre d'Affaires",
        },
        ticks: {
          callback: function (value) {
            return (value);
          },
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        title: {
          display: true,
          text: "Nombre de Ventes",
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
});

// Helpers
const getPeriodLabel = () => {
  const labels = {
    today: "Aujourd'hui (par heure)",
    week: "Cette semaine (par jour)",
    month: "Ce mois (par jour)",
    quarter: "Ce trimestre (par mois)",
    year: "Cette année (par mois)",
    all: "Toutes les années",
  };
  return labels[props.period] || "Période";
};


</script>

<template>
  <div class="w-full h-full">
    <div
      v-if="!salesData || salesData.length === 0"
      class="flex items-center justify-center h-64 text-gray-500"
    >
      <div class="text-center">
        <svg
          class="w-12 h-12 mx-auto mb-2 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p>Aucune donnée à afficher</p>
      </div>
    </div>

    <div v-else class="h-64 md:h-80">
      <Bar
        v-if="chartType === 'bar'"
        :data="chartData"
        :options="chartOptions"
      />
      <Line
        v-else-if="chartType === 'line'"
        :data="chartData"
        :options="chartOptions"
      />
      <Doughnut
        v-else-if="chartType === 'doughnut'"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>
