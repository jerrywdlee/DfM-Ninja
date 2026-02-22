class DfmCase {
    constructor(data = {}) {
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
        const stage = this.activeStage;
        if (!stage || !this.activeStepId) return null;

        if (Array.isArray(stage.steps)) {
            // Template-based steps
            const stepIndex = parseInt(this.activeStepId.replace('step-', ''));
            return stage.steps[stepIndex] || null;
        }

        // Default steps (hardcoded)
        const stepMap = { 'llm': 'LLM連携', 'confirm': '確認メール', 'reply': '回答作成' };
        return { name: stepMap[this.activeStepId] || this.activeStepId };
    }

    /**
     * Serialize to plain object for localStorage
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            stages: this.stages,
            activeStageId: this.activeStageId,
            activeStepId: this.activeStepId
        };
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
