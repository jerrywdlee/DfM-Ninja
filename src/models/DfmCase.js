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
        this.SLA = data.SLA || 'Met';
        this.stages = data.stages || [];

        // Internal state for UI shortcuts (Persisted for seamless experience)
        this.activeStageId = data.activeStageId || (this.stages && this.stages.length > 0 ? this.stages[0].id : null);
        this.activeStepId = data.activeStepId || (this.activeStageId ? (Array.isArray(this.activeStage?.steps) ? 'step-0' : 'llm') : null);

        // Determine base Lic once at initialization if not explicitly set
        if (!data.Lic) {
            let isPro = false;
            const checkServName = (obj) => obj && obj.servName && /professional|office\s*technical\s*support/i.test(obj.servName);

            if (checkServName(this)) {
                isPro = true;
            } else if (this.stages) {
                isPro = this.stages.some(stage =>
                    checkServName(stage) || (stage.steps && stage.steps.some(checkServName))
                );
            }
            this.Lic = isPro ? 'Pro' : 'Pre';
        } else {
            this.Lic = data.Lic;
        }
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
     * 0. System Templates (recursive)
     * 1. Dynamic NC Date formatting (prevNC, currentNC, nextNC)
     * 2. activeStep
     * 3. activeStage
     * 4. this (DfmCase)
     * 5. settings (injected)
     */
    render(text, depth = 0) {
        if (!text) return '';
        if (depth > 5) return text; // Prevent infinite recursion

        return text.replace(/\{\{(.+?)\}\}/g, (match, key) => {
            const k = key.trim();

            // 0. Check System Templates (window.sysTemplates)
            if (window.sysTemplates && Array.isArray(window.sysTemplates)) {
                const sysTemp = window.sysTemplates.find(t => t.id === k);
                if (sysTemp && sysTemp.content) {
                    // Evaluate renderIf condition if present
                    if (sysTemp.renderIf) {
                        try {
                            const condition = new Function(`return ${sysTemp.renderIf}`).bind(this);
                            if (!condition()) {
                                return ''; // Render as empty string if condition fails
                            }
                        } catch (e) {
                            console.error(`Error evaluating renderIf for template ${sysTemp.id}:`, e);
                            return ''; // Safety fallback
                        }
                    }
                    return this.render(sysTemp.content, depth + 1);
                }
            }

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

            // 2. Dynamic Lic formatting
            const licMatch = k.match(/^Lic(_S|_L|_XL)?$/);
            if (licMatch) {
                const suffix = licMatch[1] || '';
                const isPro = this.Lic === 'Pro';

                if (isPro) {
                    if (suffix === '_S') return 'Pro';
                    if (suffix === '_L') return 'Pro';
                    if (suffix === '_XL') return 'Professional';
                    return 'Pro'; // default
                } else {
                    // Pre (default)
                    if (suffix === '_S') return 'Pre';
                    if (suffix === '_L') return 'Unified';
                    if (suffix === '_XL') return 'Premier';
                    return 'Pre'; // default
                }
            }

            // 2.5. Stage Log (Previous Stages)
            const logMatch = k.match(/^stageLog(_Dot|_Dash)?$/);
            if (logMatch) {
                const suffix = logMatch[1];
                const activeIndex = this.stages.findIndex(s => s.id === this.activeStageId);
                if (activeIndex <= 0) return '';
                
                const prefix = suffix === '_Dot' ? '・' : (suffix === '_Dash' ? '- ' : '');
                const previousStages = this.stages.slice(0, activeIndex);
                const logLines = previousStages.map(stage => {
                    if (!stage.nc) return `${prefix}MM/DD ${stage.name}`; // Fallback
                    const ncDate = new Date(stage.nc);
                    const mm = String(ncDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(ncDate.getDate()).padStart(2, '0');
                    return `${prefix}${mm}/${dd} ${stage.name}`;
                });
                
                return logLines.join('\n');
            }

            // 3. Dynamic Settings-based formatting
            if (this.settings) {
                if (k === 'mailTo') {
                    return Array.isArray(this.settings.MailList?.to) ? this.settings.MailList.to.join(', ') : '';
                }
                if (k === 'mailCc') {
                    return Array.isArray(this.settings.MailList?.cc) ? this.settings.MailList.cc.join(', ') : '';
                }
                if (k === 'dfmCc') {
                    return Array.isArray(this.settings.MailList?.ccDfM) ? this.settings.MailList.ccDfM.join(', ') : '';
                }
                if (k === 'nameWithKana') {
                    return this.settings.Editor?.nameWithKana || '';
                }
                if (k === 'familyName') {
                    return this.settings.Editor?.familyName || '';
                }
                if (k === 'agentEmail') {
                    return this.settings.Editor?.email || '';
                }
                if (k === 'mailToNames') {
                    const toList = this.settings.MailList?.to || [];
                    const coEditors = this.settings.CoEditors || [];
                    const names = toList.map(email => {
                        const person = coEditors.find(e => e.email === email);
                        return person && person.familyName ? `${person.familyName}さん` : null;
                    }).filter(Boolean);
                    return names.length > 0 ? names.join('、') : match;
                }
                if (k === 'agentAndLeaders') {
                    const ccDfmList = this.settings.MailList?.ccDfM || [];
                    const editor = this.settings.Editor;
                    const coEditors = this.settings.CoEditors || [];

                    const lines = ccDfmList.map(email => {
                        let person = null;
                        if (editor && editor.email === email) {
                            person = editor;
                        } else {
                            person = coEditors.find(e => e.email === email);
                        }

                        if (person) {
                            const ttl = person.ttl || '';
                            const nameWithKana = person.nameWithKana || '';
                            const extNum = person.extNum;
                            const personEmail = person.email || '';

                            let line = `【${ttl}】${nameWithKana}`;
                            // Only add extNum if it exists and is not empty string
                            if (extNum && extNum.trim() !== '') {
                                line += ` 内線番号 : ${extNum}`;
                            }
                            line += ` E-Mail : ${personEmail}`;
                            return line;
                        }
                        return null;
                    }).filter(Boolean);

                    return lines.length > 0 ? lines.join('\r\n') : match;
                }
            }

            // 4. Check activeStep
            const step = this.activeStep;
            if (step && step[k] !== undefined) return step[k];

            // 3. Check activeStage and all its steps
            const stage = this.activeStage;
            if (stage) {
                // Check stage root properties first
                if (stage[k] !== undefined) return stage[k];

                // Merge all steps in the stage into a single dummy object and check
                if (Array.isArray(stage.steps)) {
                    let combinedSteps = {};
                    stage.steps.forEach(s => {
                        Object.assign(combinedSteps, s);
                    });
                    if (combinedSteps[k] !== undefined) return combinedSteps[k];
                }
            }

            // 4. Check DfmCase
            if (this[k] !== undefined && typeof this[k] !== 'function') return (k === 'SLA' && !this[k]) ? 'Met' : this[k];

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
