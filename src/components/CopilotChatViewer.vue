<template>
    <div class="tiles-container">      
        <v-card elevation="4" color="white" variant="elevated" class="mx-auto my-3" style="width: 300px; height: 175px;">
            <v-card-item>
                <div class="tiles-text">
                    <div class="spacing-25"></div>
                    <div class="text-h6 mb-1">Cumulative Number of Turns</div>
                    <div class="text-caption">Over the last 28 days</div>
                    <p class="text-h4">{{ cumulativeNumberTurns }}</p>
                </div>
            </v-card-item>
        </v-card>

        <v-card elevation="4" color="white" variant="elevated" class="mx-auto my-3" style="width: 300px; height: 175px;">
            <v-card-item>
                <div class="tiles-text">
                    <div class="spacing-10"></div>
                    <div class="text-h6 mb-1">Cumulative Number of Acceptances</div>
                    <div class="text-caption">Over the last 28 days</div>
                    <p class="text-h4">{{ cumulativeNumberAcceptances }}</p>
                </div>
            </v-card-item>
        </v-card>
    </div>

    <v-main class="p-1" style="min-height: 300px;">
        <v-container style="min-height: 300px;" class="px-4 elevation-2">

            <h2>Total Acceptances | Total Turns Count</h2>
            <Line :data="totalNumberAcceptancesAndTurnsChartData" :options="chartOptions" />

            <h2>Total Active Copilot Chat Users</h2>
            <Bar :data="totalActiveCopilotChatUsersChartData" :options="totalActiveChatUsersChartOptions" />

        </v-container>
    </v-main>
</template>
  
<script lang="ts">
  import { defineComponent, ref, watch, computed, PropType } from 'vue';
  import { Metrics } from '../model/Metrics';
  import { Line, Bar } from 'vue-chartjs'
  import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'


ChartJS.register(
  ArcElement, 
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default defineComponent({
  name: 'CopilotChatViewer',
  props: {
    metrics: {
      type: Array as PropType<Metrics[]>,
      required: true
    }
  },
  components: {
    Bar,
    Line
  },
  setup(props) {
    // 使用计算属性来处理累计值
    const cumulativeNumberTurns = computed(() => {
      if (!Array.isArray(props.metrics)) return 0;
      return props.metrics.reduce((sum, m) => sum + (m.total_chat_turns || 0), 0);
    });

    const cumulativeNumberAcceptances = computed(() => {
      if (!Array.isArray(props.metrics)) return 0;
      return props.metrics.reduce((sum, m) => sum + (m.total_chat_acceptances || 0), 0);
    });

    // 修改图表数据的类型定义
    interface ChartDataset {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string;
      borderWidth?: number;
    }

    interface ChartData {
      labels: string[];
      datasets: ChartDataset[];
    }

    // 使用正确的类型定义初始化图表数据
    const totalNumberAcceptancesAndTurnsChartData = ref<ChartData>({
      labels: [],
      datasets: []
    });

    const totalActiveCopilotChatUsersChartData = ref<ChartData>({
      labels: [],
      datasets: []
    });

    // 更新图表数据的函数
    const updateChartData = () => {
      if (!Array.isArray(props.metrics)) return;

      const data = props.metrics;
      const labels = data.map(m => m.day);

      totalNumberAcceptancesAndTurnsChartData.value = {
        labels,
        datasets: [
          {
            label: 'Total Acceptances',
            data: data.map(m => m.total_chat_acceptances || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Total Turns',
            data: data.map(m => m.total_chat_turns || 0),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      };

      totalActiveCopilotChatUsersChartData.value = {
        labels,
        datasets: [{
          label: 'Total Active Copilot Chat Users',
          data: data.map(m => m.total_active_chat_users || 0),
          backgroundColor: 'rgba(0, 0, 139, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      };
    };

    // 监听 metrics 变化并更新图表
    watch(
      () => props.metrics,
      () => {
        updateChartData();
      },
      { immediate: true, deep: true }
    );

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true
    };

    const totalActiveChatUsersChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    };

    return {
      cumulativeNumberTurns,
      cumulativeNumberAcceptances,
      totalNumberAcceptancesAndTurnsChartData,
      totalActiveCopilotChatUsersChartData,
      chartOptions,
      totalActiveChatUsersChartOptions
    };
  }
});

</script>
