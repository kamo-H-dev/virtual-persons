<template>
  <v-card elevation="0" class="image-card">
    <v-card-title class="image-card-title py-2">
      <title-header
          :type="card.type"
          :title="card.title + '(' + card.id + ')'"
          :prompt="prompts['image']"
          :prompt-types="getParentsTypes(index, card.type)"
          :selections="card.selections"
          @heading-change="headingChange"
          @heading-repeat="headingRepeat"
          @source-change="sourceChange"
      />
    </v-card-title>
    <v-list-group v-model="isSettingsOpen">
      <template #activator>
        <div class="settings-activator d-flex align-center mr-auto">
          <i class="settings-icon" />
          <v-list-item-title>Settings</v-list-item-title>
        </div>
      </template>
      <v-radio-group v-model="currentServiceName" class="mt-2 ml-3" @change="generateImageByChange">
        <v-radio
            v-for="service in imageServices"
            :key="service.value"
            :class="service.value"
            :value="service.value"
            :disabled="service.disabled"
        >
          <template v-slot:label>
            <div v-if="isServiceActive(service.value)" class="custom-label">
              <service-row
                  v-model="imageParams"
                  :params="imageParams"
                  :advanced-type="service.advancedType"
                  :label="service.text"
              />
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </v-list-group>
  </v-card>
</template>

<script>
import { mapGetters } from 'vuex'
import cloneDeep from 'lodash/cloneDeep'
import TitleHeader from '~/partials/TitleHeader.vue'
import ServiceRow from '~/partials/ServiceRow.vue'

export default {
  name: 'ImageCard',
  components: {
    ServiceRow,
    TitleHeader,
  },
  props: {
    card: {
      type: Object,
      required: true,
      validator(value) {
        return value.hasOwnProperty('selections') && value.hasOwnProperty('type')
      },
    },
    index: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      imageParams: cloneDeep(this.card.selections.settings.generateImageBy.params),
      isSettingsOpen: false,
    }
  },
  computed: {
    ...mapGetters({
      imageServices: 'template/getGenerateImageServices',
      prompts: 'template/getAiPrompts',
      getParentsTypes: 'template/getParentsTypes',
    }),
    // `currentServiceName` computed property is used to bind the value of the current
    // selected service to the radio group. When the user selects a new service, the
    // `currentServiceName` setter is called, which updates the `generateImageBy` object
    // in the `card.selections.settings` with the new service name and the current
    // image parameters. The updated `card.selections.settings` object is then emitted
    // to the parent component as a change event.
    currentServiceName: {
      get() {
        return this.card.selections.settings.generateImageBy.name
      },
      set(newServiceName) {
        const settings = {
          ...this.card.selections.settings,
          generateImageBy: { name: newServiceName, params: this.imageParams },
        }
        this.$emit('change', { index: this.index, selections: { ...this.card.selections, settings } })
      },
    },
  },
  watch: {
    // The `imageParams` watch handler is used to keep the `card.selections.settings.generateImageBy.params`
    // object in sync with the `imageParams` data property. When the user updates the image parameters,
    // this watch handler is called, which updates the `card.selections.settings.generateImageBy.params`
    // object with the new image parameters. The updated `card.selections.settings` object is then emitted
    // to the parent component as a change event.
    imageParams: {
      handler(newValue) {
        const settings = {
          ...this.card.selections.settings,
          generateImageBy: { name: this.currentServiceName, params: newValue },
        }
        this.$emit('change', { index: this.index, selections: { ...this.card.selections, settings } })
      },
      deep: true,
    },
  },
  methods: {
    // The `headingChange`, `headingRepeat`, and `sourceChange` methods are used to emit
    // change events to the parent component when the user updates the heading, repeat, or prompt source
    // for the image card.
    headingChange(heading) {
      this.emitChange('heading', heading)
    },
    headingRepeat(repeat) {
      this.emitChange('repeat', repeat)
    },
    sourceChange(promptSource) {
      this.emitChange('promptSource', promptSource)
    },
    emitChange(field, value) {
      this.$emit('change', { index: this.index, selections: { ...this.card.selections, [field]: value } })
    },
    generateImageByChange() {
      const settings = {
        ...this.card.selections.settings,
        generateImageBy: { name: this.currentServiceName, params: this.imageParams },
      }
      this.$emit('change', { index: this.index, selections: { ...this.card.selections, settings } })
    },
    isServiceActive(serviceName) {
      return serviceName === this.currentServiceName
    },
  },
}
</script>

<style scoped>
.image-card {
  overflow: hidden;
  border-radius: 20px !important;
  background: #edf3f6;

  .image-card-title {
    background: #dde9ee;
  }

  .settings-activator {
    height: 63px;
  }

  .settings-icon {
    display: inline-block;
    width: 22px;
    height: 22px;
    margin-right: 8px;
    background-repeat: no-repeat;
    background-size: contain;
    background-image: url('@/assets/icons/settings-icon.png');
  }
}

.v-input--radio-group {
  .v-radio::v-deep {
    margin: 25px 0 10px;
    height: 42px;
    border-radius: 20px;
    padding: 6px 20px 6px 6px;

    &.v-item--active .custom-label {
      font-weight: 600;
      color: #000;
    }

    &.midjourney .v-input--selection-controls__input::before {
      background-image: url('@/assets/icons/midjourney-icon.png');
    }

    &.stable_diffusion_xl .v-input--selection-controls__input::before {
      background-image: url('@/assets/icons/stable-diffusion-icon.png');
    }

    &.dalle_3 .v-input--selection-controls__input::before {
      background-image: url('@/assets/icons/openAI-icon.png');
    }
  }
}
</style>
