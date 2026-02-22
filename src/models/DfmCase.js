class DfmCase {
    constructor(data = {}) {
        // Copy all properties to allow arbitrary metadata storage
        Object.assign(this, data);

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
        if (this.activeStepId === 'llm') return this.activeStage.llm || null;
        if (this.activeStepId.startsWith('step-')) {
            const index = parseInt(this.activeStepId.split('-')[1]);
            return this.activeStage.steps ? this.activeStage.steps[index] : null;
        }
        return null;
    }

    /**
     * Render a string by replacing {{key}} with values from:
     * 1. activeStep
     * 2. activeStage
     * 3. this (DfmCase)
     */
    render(text) {
        if (!text) return '';
        return text.replace(/\{\{(.+?)\}\}/g, (match, key) => {
            const k = key.trim();

            // 1. Check activeStep
            const step = this.activeStep;
            if (step && step[k] !== undefined) return step[k];

            // 2. Check activeStage
            const stage = this.activeStage;
            if (stage && stage[k] !== undefined) return stage[k];

            // 3. Check DfmCase
            if (this[k] !== undefined && typeof this[k] !== 'function') return this[k];

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
