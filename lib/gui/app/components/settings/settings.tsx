/*
 * Copyright 2019 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as _ from 'lodash';
import * as propTypes from 'prop-types';
import * as React from 'react';
import { Badge, Button, Checkbox, Modal, Provider } from 'rendition';
import styled from 'styled-components';
import packageJSON = require('../../../../../package.json');
import * as settings from '../../models/settings';
import * as store from '../../models/store';
import * as analytics from '../../modules/analytics';
import { open as openExternal } from '../../os/open-external/services/open-external';
import { colors } from '../../theme';

const { useState } = React;

export const SettingsButton = () => {
	const [hideModal, setHideModal] = useState(true);

	return (
		<Provider>
			<Button
				icon={<FontAwesomeIcon icon={faCog} />}
				color={colors.secondary.background}
				fontSize={24}
				plain
				onClick={() => setHideModal(false)}
				tabIndex={5}
			></Button>
			{hideModal ? null : (
				<SettingsModal toggleModal={(value: boolean) => setHideModal(!value)} />
			)}
		</Provider>
	);
};

SettingsButton.propTypes = {};

interface WarningModalProps {
	message: string;
	confirmLabel: string;
	cancel: () => void;
	done: () => void;
}

const WarningModal = ({
	message,
	confirmLabel,
	cancel,
	done,
}: WarningModalProps) => {
	return (
		<Modal
			title={confirmLabel}
			action={confirmLabel}
			cancel={cancel}
			done={done}
			style={{
				width: 420,
				height: 300,
			}}
			primaryButtonProps={{ warning: true }}
		>
			{message}
		</Modal>
	);
};

interface Setting {
	name: string;
	label: string | JSX.Element;
	options?: any;
	hide?: boolean;
}

const settingsList: Setting[] = [
	{
		name: 'errorReporting',
		label: 'Anonymously report errors and usage statistics to balena.io',
	},
	{
		name: 'validateWriteOnSuccess',
		label: 'Validate write on success',
	},
	{
		name: 'trim',
		label: 'Trim ext{2,3,4} partitions before writing (raw images only)',
	},
	{
		name: 'updatesEnabled',
		label: 'Auto-updates enabled',
	},
	{
		name: 'unsafeMode',
		label: (
			<span>
				Unsafe mode{' '}
				<Badge danger fontSize={12}>
					Dangerous
				</Badge>
			</span>
		),
		options: {
			description: `Are you sure you want to turn this on?
			You will be able to overwrite your system drives if you're not careful.`,
			confirmLabel: 'Enable unsafe mode',
		},
		hide: settings.get('disableUnsafeMode'),
	},
];

interface SettingsModalProps {
	toggleModal: (value: boolean) => void;
}

interface Dictionary<T> {
	[key: string]: T;
}

export const SettingsModal: any = styled(
	({ toggleModal }: SettingsModalProps) => {
		const [currentSettings, setCurrentSettings]: [
			Dictionary<any>,
			React.Dispatch<React.SetStateAction<Dictionary<any>>>,
		] = useState(settings.getAll());
		const [warning, setWarning]: [
			any,
			React.Dispatch<React.SetStateAction<any>>,
		] = useState({});

		const toggleSetting = async (setting: string, options?: any) => {
			const value = currentSettings[setting];
			const dangerous = !_.isUndefined(options);

			analytics.logEvent('Toggle setting', {
				setting,
				value,
				dangerous,
				// @ts-ignore
				applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
			});

			if (value || !dangerous) {
				await settings.set(setting, !value);
				setCurrentSettings({
					...currentSettings,
					[setting]: !value,
				});
				setWarning({});
				return;
			}

			// Show warning since it's a dangerous setting
			setWarning({
				setting,
				settingValue: value,
				...options,
			});
		};

		return (
			<Modal
				id="settings-modal"
				title="Settings"
				done={() => toggleModal(false)}
				style={{
					width: 780,
					height: 420,
				}}
			>
				<div>
					{_.map(settingsList, (setting: Setting, i: number) => {
						return setting.hide ? null : (
							<div key={setting.name}>
								<Checkbox
									toggle
									tabIndex={6 + i}
									label={setting.label}
									checked={currentSettings[setting.name]}
									onChange={() => toggleSetting(setting.name, setting.options)}
								/>
							</div>
						);
					})}
					<div>
						<span
							onClick={() =>
								openExternal(
									'https://github.com/rdbox-intec/rdboxGARIBAN/releases',
								)
							}
						>
							<FontAwesomeIcon icon={faGithub} /> {packageJSON.version}
						</span>
					</div>
				</div>

				{_.isEmpty(warning) ? null : (
					<WarningModal
						message={warning.description}
						confirmLabel={warning.confirmLabel}
						done={() => {
							settings.set(warning.setting, !warning.settingValue);
							setCurrentSettings({
								...currentSettings,
								[warning.setting]: true,
							});
							setWarning({});
						}}
						cancel={() => {
							setWarning({});
						}}
					/>
				)}
			</Modal>
		);
	},
)`
	> div:nth-child(3) {
		justify-content: center;
	}
`;

SettingsModal.propTypes = {
	toggleModal: propTypes.func,
};
