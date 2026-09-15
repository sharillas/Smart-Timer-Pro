const {
	InstanceBase,
	Regex,
	runEntrypoint,
	InstanceStatus,
	combineRgb,
} = require('@companion-module/base');

const ICONS = require('./icons.js');

const BLACK = combineRgb(0, 0, 0);
const WHITE = combineRgb(255, 255, 255);

class SmartTimerProInstance extends InstanceBase {
	async init(config) {
		this.config = config;
		this.updateStatus(InstanceStatus.Connecting);

		this.state = {
			time: '10:00',
			running: false,
			msg_active: false,
			raw_seconds: 600,
			over_time: '',
			mode: 'countdown',
			messages: [],
		};
		this.initActions();
		this.initVariables();
		this.initFeedbacks();
		this.initPresets();

		if (this.config.host) {
			this.startPolling();
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing IP Address');
		}
	}

	async destroy() {
		if (this.pollTimer) clearInterval(this.pollTimer);
	}

	async configUpdated(config) {
		this.config = config;
		if (this.config.host) this.startPolling();
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Smart Timer Pro IP Address (e.g. 192.168.1.50)',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Port (default: 3000)',
				width: 4,
				default: '3000',
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'pin',
				label: 'PIN (only if configured in the app)',
				width: 4,
				default: '',
			},
		];
	}

	startPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer);
		const port = this.config.port || '3000';

		this.pollTimer = setInterval(async () => {
			try {
				const response = await fetch(
					`http://${this.config.host}:${port}/api/companion`,
				);
				if (response.ok) {
					this.updateStatus(InstanceStatus.Ok);
					const data = await response.json();
					this.state = data;

					const raw = data.raw_seconds || 0;
					const abs = Math.abs(raw);
					const agLeft = data.agendaTimeLeft || 0;
					const agAbs = Math.abs(agLeft);

					const updates = {
						time: data.time,
						raw_seconds: raw,
						over_time: data.over_time,
						mode: data.mode,
						sign: raw < 0 ? '-' : '',
						hours: Math.floor(abs / 3600).toString().padStart(2, '0'),
						minutes: Math.floor((abs % 3600) / 60).toString().padStart(2, '0'),
						seconds: (abs % 60).toString().padStart(2, '0'),
						agenda_name: data.agendaActive ? data.agendaName || '' : '',
						agenda_time:
							Math.floor(agAbs / 60).toString().padStart(2, '0') +
							':' +
							(agAbs % 60).toString().padStart(2, '0'),
						agenda_total:
							Math.floor((data.agendaTotal || 0) / 60).toString().padStart(2, '0') +
							':' +
							((data.agendaTotal || 0) % 60).toString().padStart(2, '0'),
					};

					for (let i = 0; i < 10; i++) {
						updates[`msg_${i + 1}`] =
							data.messages && data.messages[i]
								? data.messages[i]
								: '(Empty Slot)';
					}

					this.setVariableValues(updates);
					this.checkFeedbacks('timer_state', 'msg_state');
				}
			} catch (e) {
				this.updateStatus(
					InstanceStatus.ConnectionFailure,
					'Cannot connect to Smart Timer Pro',
				);
			}
		}, 300);
	}

	initVariables() {
		const vars = [
			{ name: 'Current Time (String)', variableId: 'time' },
			{ name: 'Raw Time in Seconds', variableId: 'raw_seconds' },
			{ name: 'Over Time (+MM:SS)', variableId: 'over_time' },
			{ name: 'Current Mode', variableId: 'mode' },
			{ name: 'Hours (HH)', variableId: 'hours' },
			{ name: 'Minutes (MM)', variableId: 'minutes' },
			{ name: 'Seconds (SS)', variableId: 'seconds' },
			{ name: 'Sign (- when overtime)', variableId: 'sign' },
			{ name: 'Agenda Session Name', variableId: 'agenda_name' },
			{ name: 'Agenda Time Left (MM:SS)', variableId: 'agenda_time' },
			{ name: 'Agenda Session Total (MM:SS)', variableId: 'agenda_total' },
		];

		for (let i = 1; i <= 10; i++) {
			vars.push({
				name: `Custom Message Slot ${i}`,
				variableId: `msg_${i}`,
			});
		}

		this.setVariableDefinitions(vars);
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			timer_state: {
				name: 'Auto-Color Timer Button',
				type: 'advanced',
				label: 'Timer State Colors (green=running, orange=warning, red=expired)',
				options: [],
				callback: () => {
					if (this.state.mode !== 'countdown') return {};
					if (!this.state.running && this.state.raw_seconds > 0) return {};

					if (this.state.raw_seconds <= 0) {
						return {
							bgcolor: combineRgb(239, 68, 68),
							color: WHITE,
						};
					}
					if (this.state.raw_seconds <= 120) {
						return {
							bgcolor: combineRgb(245, 158, 11),
							color: WHITE,
						};
					}
					return {
						bgcolor: combineRgb(16, 185, 129),
						color: WHITE,
					};
				},
			},
			msg_state: {
				name: 'Message Active Background',
				type: 'boolean',
				label: 'Message is active on screen',
				defaultStyle: {
					bgcolor: combineRgb(0, 163, 224),
					color: WHITE,
				},
				options: [],
				callback: () => {
					return this.state.msg_active;
				},
			},
		});
	}

	initActions() {
		const port = this.config ? this.config.port || '3000' : '3000';
		const pin = this.config ? this.config.pin || '' : '';

		const sendCmd = async (cmd) => {
			if (!this.config || !this.config.host) return;
			const sep = cmd.includes('?') ? '&' : '?';
			try {
				await fetch(`http://${this.config.host}:${port}/api/${cmd}${pin ? sep + 'pin=' + encodeURIComponent(pin) : ''}`);
			} catch (e) {}
		};

		this.setActionDefinitions({
			toggle_playback: {
				name: 'Toggle Start / Pause',
				options: [],
				callback: async () => {
					await sendCmd('toggle_playback');
				},
			},
			start: {
				name: 'Start Timer',
				options: [],
				callback: async () => {
					await sendCmd('start');
				},
			},
			pause: {
				name: 'Pause Timer',
				options: [],
				callback: async () => {
					await sendCmd('pause');
				},
			},
			toggle_msg: {
				name: 'Toggle Message On/Off',
				options: [],
				callback: async () => {
					await sendCmd('message/toggle');
				},
			},
			hide_msg: {
				name: 'Hide Message',
				options: [],
				callback: async () => {
					await sendCmd('message/hide');
				},
			},
			trigger_msg: {
				name: 'Trigger Instant Message by Slot Number',
				options: [
					{
						type: 'number',
						label: 'Slot Number (1-5)',
						id: 'slot',
						default: 1,
						min: 1,
						max: 5,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`message/trigger?index=${action.options.slot - 1}`);
				},
			},
			reset: {
				name: 'Reset Timer',
				options: [
					{
						type: 'number',
						label: 'Seconds (e.g. 600 for 10m)',
						id: 'sec',
						default: 600,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`reset?sec=${action.options.sec}`);
				},
			},
			reset_last: {
				name: 'Reset to Last Set Time',
				options: [],
				callback: async () => {
					await sendCmd('reset');
				},
			},
			add: {
				name: 'Add/Subtract Time',
				options: [
					{
						type: 'number',
						label: 'Seconds to add (-60 to subtract 1 min)',
						id: 'sec',
						default: 60,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`add?sec=${action.options.sec}`);
				},
			},
			set_mode: {
				name: 'Set Display Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'mode',
						default: 'countdown',
						choices: [
							{ id: 'countdown', label: 'Countdown' },
							{ id: 'countup', label: 'Count-Up' },
							{ id: 'timeofday', label: 'Time of Day' },
							{ id: 'logo', label: 'Idle / Logo' },
						],
					},
				],
				callback: async (action) => {
					await sendCmd(`mode?set=${action.options.mode}`);
				},
			},
			set_indicator: {
				name: 'Loading Bar / Semáforo',
				options: [
					{
						type: 'dropdown',
						label: 'Type',
						id: 'type',
						default: 'bar',
						choices: [
							{ id: 'bar', label: 'Loading Bar' },
							{ id: 'semaforo', label: 'Semáforo' },
						],
					},
					{
						type: 'dropdown',
						label: 'Action',
						id: 'action',
						default: 'on',
						choices: [
							{ id: 'on', label: 'ON' },
							{ id: 'off', label: 'OFF' },
						],
					},
				],
				callback: async (action) => {
					await sendCmd(`indicator?type=${action.options.type}&action=${action.options.action}`);
				},
			},
			agenda_start: {
				name: 'Agenda - Start Session',
				options: [
					{
						type: 'number',
						label: 'Session Index (0 = first, empty = from the beginning)',
						id: 'index',
						default: 0,
						min: 0,
						max: 99,
						required: false,
					},
				],
				callback: async (action) => {
					const idx = action.options.index;
					await sendCmd(`agenda/start${idx !== undefined && idx !== null && idx !== '' ? '?index=' + idx : ''}`);
				},
			},
			agenda_next: {
				name: 'Agenda - Next Session',
				options: [],
				callback: async () => {
					await sendCmd('agenda/next');
				},
			},
			agenda_stop: {
				name: 'Agenda - Stop Rundown',
				options: [],
				callback: async () => {
					await sendCmd('agenda/stop');
				},
			},
		});
	}

	initPresets() {
		const presets = {};

		const iconStyle = (icon, text, size) => ({
			text: text || '',
			size: size || '14',
			color: WHITE,
			bgcolor: BLACK,
			png64: ICONS[icon] || undefined,
			pngalignment: 'top:center',
			alignment: 'center:bottom',
			show_topbar: false,
		});

		const textStyle = (text, size) => ({
			text,
			size: size || '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		});

		// Timer Display (HH : MM : SS read-only)
		presets['display_hours'] = { type: 'button', category: 'Timer Display', name: 'Timer Display - Hours (HH)', style: textStyle('$(smart-timer-pro:sign)$(smart-timer-pro:hours)', '40'), steps: [], feedbacks: [] };
		presets['display_minutes'] = { type: 'button', category: 'Timer Display', name: 'Timer Display - Minutes (MM)', style: textStyle('$(smart-timer-pro:minutes)', '40'), steps: [], feedbacks: [] };
		presets['display_seconds'] = { type: 'button', category: 'Timer Display', name: 'Timer Display - Seconds (SS)', style: textStyle('$(smart-timer-pro:seconds)', '40'), steps: [], feedbacks: [] };

		presets['smart_timer'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Smart Timer Button (toggle + time display)',
			style: iconStyle('play_circle_filled', '$(smart-timer-pro:time)', '16'),
			steps: [{ down: [{ actionId: 'toggle_playback', options: {} }], up: [] }],
			feedbacks: [{ feedbackId: 'timer_state', options: {} }],
		};

		presets['go_start'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'GO (Start)',
			style: { text: 'GO', size: '20', color: WHITE, bgcolor: combineRgb(16, 185, 129), png64: ICONS['play_circle_filled'], pngalignment: 'top:center', alignment: 'center:bottom', show_topbar: false },
			steps: [{ down: [{ actionId: 'start', options: {} }], up: [] }],
			feedbacks: [],
		};

		presets['pause_stop'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Pause',
			style: { text: 'PAUSE', size: '18', color: WHITE, bgcolor: combineRgb(245, 158, 11), png64: ICONS['stop'], pngalignment: 'top:center', alignment: 'center:bottom', show_topbar: false },
			steps: [{ down: [{ actionId: 'pause', options: {} }], up: [] }],
			feedbacks: [],
		};

		presets['smart_message'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Toggle Message',
			style: iconStyle('chat', 'MSG', '16'),
			steps: [{ down: [{ actionId: 'toggle_msg', options: {} }], up: [] }],
			feedbacks: [{ feedbackId: 'msg_state', options: {} }],
		};

		presets['reset_last'] = {
			type: 'button',
			category: 'Smart Controls',
			name: 'Reset Time',
			style: { text: 'RESET', size: '16', color: WHITE, bgcolor: combineRgb(200, 50, 50), png64: ICONS['refresh'], pngalignment: 'top:center', alignment: 'center:bottom', show_topbar: false },
			steps: [{ down: [{ actionId: 'reset_last', options: {} }], up: [] }],
			feedbacks: [],
		};

		// Quick Messages Triggers (Slots 1-5)
		for (let i = 1; i <= 5; i++) {
			presets[`trigger_msg_${i}`] = {
				type: 'button',
				category: 'Quick Messages',
				name: `Trigger Quick Message ${i}`,
				style: textStyle(`[${i}] $(smart-timer-pro:msg_${i})`, '12'),
				steps: [{ down: [{ actionId: 'trigger_msg', options: { slot: i } }], up: [] }],
				feedbacks: [],
			};
		}

		// Display Modes
		const modes = [
			{ id: 'countdown', label: 'Countdown', icon: 'timer' },
			{ id: 'countup', label: 'Count-Up', icon: 'trending_up' },
			{ id: 'timeofday', label: 'Clock', icon: 'schedule' },
			{ id: 'logo', label: 'Logo', icon: 'image' },
			{ id: 'agenda', label: 'Agenda', icon: 'event_note' },
			{ id: 'prestart', label: 'Prestart', icon: 'movie' },
		];
		modes.forEach((mode) => {
			presets[`mode_${mode.id}`] = {
				type: 'button',
				category: 'Display Modes',
				name: `${mode.label} Mode`,
				style: iconStyle(mode.icon, mode.label, '12'),
				steps: [{ down: [{ actionId: 'set_mode', options: { mode: mode.id } }], up: [] }],
				feedbacks: [],
			};
		});

		// Quick Times
		const quickTimes = [
			{ label: '1m', sec: 60 },
			{ label: '5m', sec: 300 },
			{ label: '10m', sec: 600 },
			{ label: '15m', sec: 900 },
			{ label: '30m', sec: 1800 },
			{ label: '60m', sec: 3600 },
		];

		quickTimes.forEach((t) => {
			presets[`reset_${t.sec}`] = {
				type: 'button',
				category: 'Quick Times',
				name: `Reset to ${t.label}`,
				style: iconStyle('av_timer', t.label, '16'),
				steps: [{ down: [{ actionId: 'reset', options: { sec: t.sec } }], up: [] }],
				feedbacks: [],
			};
		});

		// Manual Adjustments
		presets['add_min'] = {
			type: 'button',
			category: 'Manual Adjustments',
			name: '+1 Minute',
			style: iconStyle('add_circle_outline', '+1m', '16'),
			steps: [{ down: [{ actionId: 'add', options: { sec: 60 } }], up: [] }],
			feedbacks: [],
		};

		presets['sub_min'] = {
			type: 'button',
			category: 'Manual Adjustments',
			name: '-1 Minute',
			style: iconStyle('remove_circle_outline', '-1m', '16'),
			steps: [{ down: [{ actionId: 'add', options: { sec: -60 } }], up: [] }],
			feedbacks: [],
		};

		// Status Indicator Controls
		const indicators = [
			{ id: 'bar_on', label: 'Bar ON', icon: 'linear_scale', type: 'bar', action: 'on' },
			{ id: 'bar_off', label: 'Bar OFF', icon: 'linear_scale', type: 'bar', action: 'off' },
			{ id: 'semaforo_on', label: 'Semáforo ON', icon: 'traffic', type: 'semaforo', action: 'on' },
			{ id: 'semaforo_off', label: 'Semáforo OFF', icon: 'traffic', type: 'semaforo', action: 'off' },
		];

		indicators.forEach((ind) => {
			presets[ind.id] = {
				type: 'button',
				category: 'Status Indicator',
				name: ind.label,
				style: iconStyle(ind.icon, ind.label, '12'),
				steps: [{ down: [{ actionId: 'set_indicator', options: { type: ind.type, action: ind.action } }], up: [] }],
				feedbacks: [],
			};
		});

		// Agenda Controls
		presets['agenda_start'] = {
			type: 'button',
			category: 'Agenda',
			name: 'Agenda - Start',
			style: iconStyle('play_circle_filled', 'AGENDA', '14'),
			steps: [{ down: [{ actionId: 'agenda_start', options: {} }], up: [] }],
			feedbacks: [],
		};
		presets['agenda_next'] = {
			type: 'button',
			category: 'Agenda',
			name: 'Agenda - Next Session',
			style: iconStyle('skip_next', 'NEXT', '16'),
			steps: [{ down: [{ actionId: 'agenda_next', options: {} }], up: [] }],
			feedbacks: [],
		};
		presets['agenda_stop'] = {
			type: 'button',
			category: 'Agenda',
			name: 'Agenda - Stop',
			style: iconStyle('stop', 'STOP', '16'),
			steps: [{ down: [{ actionId: 'agenda_stop', options: {} }], up: [] }],
			feedbacks: [],
		};
		presets['agenda_display'] = {
			type: 'button',
			category: 'Agenda',
			name: 'Agenda - Session + Time Display',
			style: textStyle('$(smart-timer-pro:agenda_time)\n$(smart-timer-pro:agenda_name)', '14'),
			steps: [],
			feedbacks: [],
		};

		this.setPresetDefinitions(presets);
	}
}

runEntrypoint(SmartTimerProInstance, []);
