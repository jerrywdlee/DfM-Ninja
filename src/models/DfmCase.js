import { calculateNcDate, formatDynamicDate } from '../utils/dateUtils';

class DfmCase {
    constructor(data = {}, settings = null) {
        // Copy all properties to allow arbitrary metadata storage
        Object.assign(this, data);

        // Store settings inside the instance if provided
        if (settings) {
            this.settings = settings;
        }

        this.id = data.id || '';
        this.title = data.title || 'New Case';
        this.stages = data.stages || [];

        // Internal state for UI shortcuts (Persisted for seamless experience)
        this.activeStageId = data.activeStageId || (this.stages && this.stages.length > 0 ? this.stages[0].id : null);
        this.activeStepId = data.activeStepId || (this.activeStageId ? (Array.isArray(this.activeStage?.steps) ? 'step-0' : 'llm') : null);
    }

    /**
     * Get the currently active stage object
     */
    get activeStage() {
        if (!this.activeStageId) return null;
        return this.stages.find(s => s.id === this.activeStageId) || null;
    }

    /**
     * Get the shortcut to the currently active step (if any)
     */
    get activeStep() {
        if (!this.activeStage) return null;
        if (!this.activeStepId) return null;
        if (this.activeStepId.startsWith('step-')) {
            const index = parseInt(this.activeStepId.split('-')[1]);
            return this.activeStage.steps ? this.activeStage.steps[index] : null;
        }
        return null;
    }

    /**
     * Render a string by replacing {{key}} with values from:
     * 1. Dynamic NC Date formatting (prevNC, currentNC, nextNC)
     * 2. activeStep
     * 3. activeStage
     * 4. this (DfmCase)
     * 5. settings (injected)
     */
    render(text) {
        if (!text) return '';
        return text.replace(/\{\{(.+?)\}\}/g, (match, key) => {
            const k = key.trim();

            // 1. Dynamic NC Date formatting
            const ncMatch = k.match(/^(prevNC|currentNC|nextNC)(_XS|_S|_L|_XL)?$/);
            if (ncMatch) {
                const type = ncMatch[1];
                const suffix = ncMatch[2] || '';

                let targetDate = null;
                if (type === 'prevNC') {
                    const idx = this.stages.findIndex(s => s.id === this.activeStageId);
                    if (idx > 0 && this.stages[idx - 1].nc) {
                        targetDate = new Date(this.stages[idx - 1].nc);
                    }
                } else if (type === 'currentNC') {
                    if (this.activeStage && this.activeStage.nc) {
                        targetDate = new Date(this.activeStage.nc);
                    } else {
                        targetDate = new Date();
                    }
                } else if (type === 'nextNC') {
                    let baseDate = new Date();
                    if (this.activeStage && this.activeStage.nc) {
                        baseDate = new Date(this.activeStage.nc);
                    }
                    targetDate = calculateNcDate(baseDate, 3);
                }

                if (targetDate) {
                    return formatDynamicDate(targetDate, suffix);
                } else {
                    return type === 'prevNC' ? '' : match; // Return empty string if prevNC is not available
                }
            }

            // 2. Check activeStep
            const step = this.activeStep;
            if (step && step[k] !== undefined) return step[k];

            // 3. Check activeStage
            const stage = this.activeStage;
            if (stage && stage[k] !== undefined) return stage[k];

            // 4. Check DfmCase
            if (this[k] !== undefined && typeof this[k] !== 'function') return this[k];

            // 5. Check injected Settings
            if (this.settings && this.settings[k] !== undefined) return this.settings[k];

            // Return original if not found
            return match;
        });
    }

    /**
     * Serialize to plain object for localStorage
     */
    toJSON() {
        const json = { ...this };
        // We can keep everything, or filter out specific internal properties if needed.
        // For now, let's keep it simple and return everything.
        return json;
    }

    /**
     * Static helper to create instance from JSON
     */
    static fromJSON(json) {
        if (typeof json === 'string') json = JSON.parse(json);
        return new DfmCase(json);
    }
}

export default DfmCase;
