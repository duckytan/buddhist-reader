<template>
  <div
    class="sutra-card"
    @click="$emit('click', sutra)"
  >
    <h3 class="sutra-card__title">
      {{ sutra.title }}
    </h3>
    <div class="sutra-card__meta">
      <span class="sutra-card__author">{{ sutra.author }}</span>
      <span class="sutra-card__chars">{{ formatChars(sutra.totalChars) }}</span>
    </div>
    <span :class="['sutra-card__tag', `sutra-card__tag--${sutra.category}`]">
      {{ categoryLabel(sutra.category) }}
    </span>
  </div>
</template>

<script setup>
defineProps({ sutra: { type: Object, required: true } })
defineEmits(['click'])

const categoryLabels = {
  prajna: '般若', yogacara: '唯识', chan: '禅宗',
  mantra: '密咒', general: '通论', biography: '传记'
}

function categoryLabel(key) { return categoryLabels[key] || key }
function formatChars(n) { return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n}字` }
</script>

<style scoped>
.sutra-card {
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--card-sutra-padding);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.sutra-card:hover { background: var(--card-hover-bg); border: var(--card-hover-border); }
.sutra-card__title {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  margin-bottom: var(--spacing-sm);
}
.sutra-card__meta {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-sm);
}
.sutra-card__tag {
  display: inline-block;
  font-size: var(--text-caption);
  padding: var(--tag-padding);
  border-radius: var(--tag-radius);
}
.sutra-card__tag--prajna { background: var(--tag-prajna-bg); color: var(--tag-prajna-text); }
.sutra-card__tag--yogacara { background: var(--tag-yogacara-bg); color: var(--tag-yogacara-text); }
.sutra-card__tag--chan { background: var(--tag-chan-bg); color: var(--tag-chan-text); }
.sutra-card__tag--mantra { background: var(--tag-mantra-bg); color: var(--tag-mantra-text); }
.sutra-card__tag--general { background: var(--tag-general-bg); color: var(--tag-general-text); }
.sutra-card__tag--biography { background: var(--tag-biography-bg); color: var(--tag-biography-text); }
</style>