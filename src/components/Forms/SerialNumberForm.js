//import { useWhyDidYouUpdate } from 'use-why-did-you-update';
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRecoilValue } from 'recoil';
import { useWhyDidYouUpdate } from 'use-why-did-you-update';
import { omit } from 'lodash-es';
import ThemeCard from '../ThemeCard';
import TabbedSection from '../TabbedSection/TabbedSection';
import { debugState, currentUserState } from '../../recoil/atoms';
import * as Columns from '../../recoil/columnAtoms';
import DatabaseDefaultIcon from '../Helpers/DatabaseDefaultIcon';
import LookupField2 from '../FormControls/LookupField2';
import AsynchronousSelect2 from '../FormControls/AsynchronousSelect2';
import BottomBar from '../Helpers/BottomBar';
import PrintRecord from '../Forms/PrintRecord';
import {
	copyTextToClipboard,
	camelize,
	plurifyFormName,
} from '../Helpers/functions';
import {
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Tab,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import {
	Block,
	DeleteForever,
	Email,
	ExpandMore,
	MoreVert,
	Print,
	Restore,
	Search,
	Share,
} from '@mui/icons-material';
import TabbedSectionHeader from '../TabbedSection/TabbedSectionHeader';
import GridFormSectionWrapper from '../FormControls/GridFormSectionWrapper';
import GridInputWrapper from '../FormControls/GridInputWrapper';
import TabbedSectionContent from '../TabbedSection/TabbedSectionContent';
import StatusGraphic from '../FormControls/StatusGraphic';
import {
	useFormData,
	useDebouncedEffect,
	useCustomTableLineItemFormData,
} from '../Helpers/CustomHooks';
import CustomTable from '../CustomTable/CustomTable';
import FormWrapper from '../FormControls/FormWrapper';
import ToastMessage from '../ToastMessage/ToastMessage';
import SaveManager from '../Helpers/SaveManager';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import RenderPopup from '../Helpers/RenderPopup';
import RenderForm from '../Helpers/RenderForm';
import ConfirmationDialog from '../Helpers/ConfirmationDialog';
import TextFieldDateTime from '../FormControls/TextFieldDateTime';
import WizardDialog from '../Wizards/WizardDialog';
import WizardStep from '../Wizards/WizardStep';
import ContextCircularProgressLoader from '../Loaders/ContextCircularProgressLoader';
import RichTextField from '../RichText/RichTextField';
import CustomFormActions from '../FormControls/CustomFormActions';
import NoteReport from '../Reports/NoteReport';
import EmailReport from '../Reports/EmailReport';
import AttachmentReport from '../Reports/AttachmentReport';
import PurchaseReceiveLineItemReport from '../Reports/PurchaseReceiveLineItemReport';
import { currentUserIsAdminState } from '../../recoil/selectors';

//#region //TODO Mass update fields available
const massUpdateCapableFieldKeys = [{ label: 'Description', value: 'Account' }];
//#endregion

//#region //TODO Helper functions

//#endregion

const SerialNumberForm = ({
	formName, //Used to require fewer edits between template and specific forms
	setAppBreadcrumb, //If form is fullscreen - when rendered from a table row, this won't be defined
	resource, //Data loaded from the database
	onChange, //Function call raised when data is saved - useful for updating a parent table
	loadData, //When adding a new form, this is the data object that can contain things like: {Account: '123456', Reference: '1234566'}
	massUpdating, //Used to enable mass update mode
	massUpdateRecordIds,
	uuid,
	maxHeight,
}) => {
	const currentUser = useRecoilValue(currentUserState);
	const currentUserIsAdmin = useRecoilValue(currentUserIsAdminState);
	const columns = useRecoilValue(
		Columns[`${camelize(formName.replaceAll('_', ''))}ColumnsState`]
	);
	const debug = useRecoilValue(debugState);
	const [alerts, setAlerts] = useState({});
	const [data, setData] = useState({ ...loadData, ...resource.read() });
	const [id, setId] = useState(data.ID);
	const baseUrl = `https://creatorapp.zoho.com/visionpointllc/av-professional-services/#Page:Search?Type=${formName}&ID=${id}`;
	//https://creatorapp.zoho.com/visionpointllc/av-professional-services/#Search1?Type=Quote&ID=3860683000011594075
	const [recordTitle, setRecordTitle] = useState(data ? data.Name : null); //TODO
	const [
		state,
		addRecord,
		updateRecord,
		mountData,
		resetData,
		massUpdateRecords,
	] = useFormData(data, loadData);
	const [lineItemDataState, lineItemDispatch] = useCustomTableLineItemFormData(
		formName,
		data
	);

	const [massUpdateFieldList, setMassUpdateFieldList] = useState([]);
	const requiredFields = useRef(columns.filter((column) => column.required));
	const [error, setError] = useState({});
	const [toastData, setToastData] = useState({});
	const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
	const [confirmationDialogData, setConfirmationDialogData] = useState({});
	const [timelineOpen, setTimelineOpen] = useState(false);
	const [tabValue, setTabValue] = useState('Notes');
	const [emailWizardOpen, setEmailWizardOpen] = useState(false);
	const [printWizardOpen, setPrintWizardOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [wizard, setWizard] = useState({ open: false, activeStep: 0 });
	const hasError = Object.keys(error).length > 0;

	//! Record title when accessed via direct URL
	useEffect(() => {
		if (setAppBreadcrumb) {
			const title = () => {
				if (id) {
					return recordTitle;
				} else {
					return `Add New ${formName.replaceAll('_', '')}`;
				}
			};

			setAppBreadcrumb([
				{
					href: '',
					icon: <DatabaseDefaultIcon form={formName} sx={{ mr: 0.75 }} />,
					label: plurifyFormName(formName),
				},
				{
					href: '',
					icon: <DatabaseDefaultIcon form={formName} sx={{ mr: 0.75 }} />,
					label: title(),
				},
			]);
		}
	}, [recordTitle]);

	//#region //! Update parent table row if applicable
	useEffect(() => {
		console.log(`SerialNumberForm.js state change`, state);

		if (onChange) {
			onChange(state.savedData);
		}

		if (
			hasError &&
			(!id ||
				currentUser.Enable_Autosave === false ||
				currentUser.Enable_Autosave === 'false')
		) {
			isValid();
		}

		//! Alert: NO_TAX
		if (
			(state.currentData.Type === 'Service Order' ||
				state.currentData.Type === 'Change Order EXTERNAL') &&
			state.currentData.Tax === 0
		) {
			const thisAlert = {
				id: 'NO_TAX',
				variant: 'filled',
				severity: 'warning',
				action: null,
				message:
					'No Tax: Make sure taxes will be applied at the time of invoice or account for them on this quote',
			};

			setAlerts((old) =>
				old[thisAlert.id] ? old : { ...old, [thisAlert.id]: thisAlert }
			);
		} else if (
			alerts.NO_TAX &&
			((state.currentData.Type !== 'Service Order' &&
				state.currentData.Type !== 'Change Order EXTERNAL') ||
				state.currentData.Tax > 0)
		) {
			//Dismiss alert if currently displayed
			setAlerts((old) => omit(old, 'NO_TAX'));
		}

		//! Alert: VOID
		if (
			state.currentData.Void_field === true ||
			state.currentData.Void_field === 'true'
		) {
			const thisAlert = {
				id: 'VOID',
				variant: 'filled',
				severity: 'warning',
				action: null,
				message:
					'This Quote has been voided, so be aware that your changes will not trigger workflows and this record will be excluded from database calculations',
			};

			setAlerts((old) =>
				old[thisAlert.id] ? old : { ...old, [thisAlert.id]: thisAlert }
			);
		} else if (alerts.VOID) {
			//Dismiss alert if currently displayed
			setAlerts((old) => omit(old, 'VOID'));
		}
	}, [state]);
	//#endregion

	//#region //! Data save/autosave/reset/validity
	//! Debounced effect to raise onAutoSave() every 2 seconds
	useDebouncedEffect(
		() =>
			Object.keys(state.data).length > 0 &&
			(currentUser.Enable_Autosave === true ||
				currentUser.Enable_Autosave === 'true') &&
			!massUpdating &&
			id
				? onAutoSave()
				: null,
		[state.data, id],
		2000
	);

	//! Debounced data related to line item form's details section align with line item order
	useDebouncedEffect(
		() => {
			//This acts like a loading statement - it seems rows consistently come in last. Once they are in, data is relevant
			if (lineItemDataState.rows.length === 0) {
				return;
			}

			//Dynamically iterate through all of the keys exposed by lineItemDataState and match them against data already in the database
			let objectShapedLikeSavedData = {};
			Object.keys(lineItemDataState).forEach((key) => {
				objectShapedLikeSavedData[key] = state.savedData[key]
					? state.savedData[key]
					: lineItemDataState[key];
			});

			//If lineItemDataState differs from the last save, trigger an auto save but just for this data - it will udpate state.savedData for the next go around
			if (
				JSON.stringify(objectShapedLikeSavedData) !==
				JSON.stringify({
					...lineItemDataState,
					Line_Item_Order: JSON.stringify(lineItemDataState.Line_Item_Order),
				})
			) {
				console.log(
					'autosave objectShapedLikeSavedData',
					objectShapedLikeSavedData
				);
				console.log('autosave lineItemDataState', {
					...lineItemDataState,
					Line_Item_Order: JSON.stringify(lineItemDataState.Line_Item_Order),
				});

				updateRecord(plurifyFormName(formName), id, {
					...lineItemDataState,
					Line_Item_Order: JSON.stringify(lineItemDataState.Line_Item_Order),
				});
			}
		},
		[lineItemDataState],
		500
	);

	//! Raised by useDebouncedEffect
	const onAutoSave = () => {
		if (!id) {
			return;
		}

		if (isValid()) {
			if (debug) {
				setToastData({
					message: `DEBUG ENABLED: AutoSave called with valid form data!`,
					severity: 'info',
				});
			} else {
				if (id) {
					updateRecord(plurifyFormName(formName), id, state.data);
				}
			}
		} else {
			setToastData({
				message: `Please enter a value for all required fields`,
				severity: 'warning',
			});
		}
	};

	//! Manual Save
	const onSave = () => {
		if (isValid()) {
			if (debug) {
				setToastData({
					message: `DEBUG ENABLED: Save manually called with valid form data!`,
					severity: 'info',
				});
			} else {
				if (id) {
					updateRecord(plurifyFormName(formName), id, state.data);
				} else if (massUpdating) {
					massUpdateRecords(
						plurifyFormName(formName),
						massUpdateRecordIds,
						{},
						(response) => {
							console.log('massUpdate response', response);
						}
					);
				} else {
					addRecord(formName, state.data, (response) => setId(response.ID));
				}
			}
		} else {
			setToastData({
				message: `Please enter a value for all required fields`,
				severity: 'warning',
			});
		}
	};

	const onReset = () => {
		if (!massUpdating) {
			resetData();
			setError({});
			setData(state.savedData);
		} else {
			setMassUpdateFieldList([]);
		}
	};

	const isValid = () => {
		console.log('errorCheck requiredFields', requiredFields.current);
		let _error = {};

		if (requiredFields.current.length > 0) {
			requiredFields.current.forEach((field) => {
				if (
					!state.currentData[field.valueKey] ||
					state.currentData[field.valueKey] === 0 ||
					(Array.isArray(state.currentData[field.valueKey]) &&
						state.currentData[field.valueKey].length === 0)
				) {
					_error[field.valueKey] = true;
				}
			});
		}

		setError(_error);
		return Object.keys(_error).length === 0; //if _error = {}, returns true
	};
	//#endregion

	//#region //! Commands exposed by Actions dropdown
	const onCopyDirectUrl = async () => {
		copyTextToClipboard(baseUrl)
			.then(() =>
				setToastData({
					message: 'Direct link copied to clipboard!',
					severity: 'success',
				})
			)
			.catch(() =>
				setToastData({
					message: 'Error copying text to clipboard',
					severity: 'error',
				})
			);
	};

	const onprintWizardOpen = () => {
		setPrintWizardOpen(true);
	};

	const onOpenSendEmail = () => {
		setEmailWizardOpen(true);
	};

	const onVoid = () => {
		setConfirmationDialogData({
			title: `Void ${formName.replaceAll('_', ' ')}`,
			onConfirm: () => {
				if (currentUser.Admin === true || currentUser.Admin === 'true') {
					//If current user is an admin, allow the ability to toggle void on/off
					updateRecord(plurifyFormName(formName), id, {
						Void_field: !state.savedData.Void_field,
					});
				} else {
					updateRecord(plurifyFormName(formName), id, { Void_field: true });
				}
				setConfirmationDialogOpen(false);
			},
			confirmButtonColor: 'warning',
			children: (
				<Typography sx={{ p: 2 }}>
					Are you sure you want to{' '}
					{state.savedData.Void_field === true ||
					state.savedData.Void_field === 'true'
						? 'unvoid'
						: 'void'}{' '}
					this quote?
				</Typography>
			),
		});
		setConfirmationDialogOpen(true);
	};

	const onDelete = () => {
		setConfirmationDialogData({
			title: `Delete ${formName.replaceAll('_', ' ')}`,
			onConfirm: () => console.log('Delete => Confirm'),
			confirmButtonColor: 'error',
			children: (
				<Typography>
					Are you sure you want to delete this {formName.replaceAll('_', ' ')}?
				</Typography>
			),
		});
		setConfirmationDialogOpen(true);
	};

	//#endregion

	const getReferenceIconForm = () => {
		switch (state.currentData.Type) {
			case 'Service Order':
			case 'Box Sale':
				return 'Service_Order';
			case 'Service Contract':
				return 'Service_Contract';
			default:
				return 'Project';
		}
	};

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: 'background.default',
			}}>
			<FormWrapper
				id={id}
				viewingInTab={Boolean(uuid)}
				alerts={alerts}
				timelineOpen={timelineOpen}
				setTimelineOpen={setTimelineOpen}
				massUpdating={massUpdating}
				maxHeight={maxHeight}
				disabled={false}
				CustomFormActions={
					<CustomFormActions
						options={[
							{
								type: 'form',
								label: 'Search',
								onClick: () => setSearchOpen(true),
								Icon: Search,
							},
							{
								type: 'void',
								label: 'Delete',
								onClick: () => setDeleteDialogOpen(true),
								Icon: DeleteForever,
								disabled: !currentUserIsAdmin,
							},
						]}
					/>
				}>
				{/* Status bar if applicable */}

				{/* Mass Update Field Selctor - Driven by massUpdateCapableFieldKeys constant */}
				{massUpdating ? (
					<Box sx={{ width: '100%', px: 2, pt: 2 }}>
						<Autocomplete
							multiple
							disableCloseOnSelect
							options={massUpdateCapableFieldKeys.sort(
								(a, b) => a.label - b.label
							)}
							getOptionLabel={(option) => option.label}
							isOptionEqualToValue={(option, value) =>
								option.value === value.value
							}
							onChange={(e, newValue) =>
								setMassUpdateFieldList(newValue.map((v) => v.value))
							}
							value={massUpdateCapableFieldKeys.filter((option) =>
								massUpdateFieldList.includes(option.value) ? option : null
							)}
							renderInput={(params) => (
								<TextField
									{...params}
									variant='standard'
									label='Fields to Mass Update'
									placeholder={
										massUpdateFieldList.length === 0 ? 'Select field(s)' : ''
									}
								/>
							)}
						/>
					</Box>
				) : null}

				{massUpdating && massUpdateFieldList.length === 0 ? (
					<Box sx={{ width: '100%', py: 6 }}>
						<Typography align='center' sx={{ color: 'text.secondary' }}>
							Please select at least one field from the dropdown above to begin
						</Typography>
					</Box>
				) : (
					<ThemeCard
						header={
							massUpdating ? null : `${formName.replaceAll('_', ' ')} Details`
						}>
						<GridFormSectionWrapper>
							{/* Fields */}
							<GridInputWrapper
								massUpdating={massUpdating}
								hidden={massUpdating && !massUpdateFieldList.includes('Value')}>
								<TextField
									label='Value'
									value={state.currentData.Value}
									helperText={
										error.Value
											? 'Please enter a value for this required field'
											: ''
									}
									required
									error={error.Value}
									onChange={(e) => mountData('Value', e.target.value)}
								/>
							</GridInputWrapper>

							{/* Sections */}
							{/* <GridInputWrapper>
								<ThemeCard header='_SECTION_LABEL_' elevation={8}>
									<Grid container spacing={2}>
										<Grid item xs={12}></Grid>
									</Grid>
								</ThemeCard>
							</GridInputWrapper> */}
						</GridFormSectionWrapper>
					</ThemeCard>
				)}

				{/* Form Specific Data (e.g. table, graph, etc.) */}

				{/* Tabbed Section */}
				{id && !massUpdating ? (
					<TabbedSection>
						<TabbedSectionHeader
							value={tabValue}
							onTabChanged={(e, tabIndex) => setTabValue(tabIndex)}>
							<Tab label='Notes' value='Notes' />
							<Tab label='Emails' value='Emails' />
							<Tab label='Attachments' value='Attachments' />
						</TabbedSectionHeader>

						<TabbedSectionContent>
							{tabValue === 'Notes' ? (
								<NoteReport
									variant='tab'
									maxHeight={600}
									forcedCriteria={`Parent_ID=="${id}"`}
									loadData={{ Parent_ID: id }}
								/>
							) : tabValue === 'Emails' ? (
								<EmailReport
									variant='tab'
									maxHeight={600}
									forcedCriteria={`Parent_ID=="${id}"`}
									loadData={{ Parent_ID: id }}
								/>
							) : tabValue === 'Attachments' ? (
								<AttachmentReport
									variant='tab'
									maxHeight={600}
									forcedCriteria={`Parent_ID=="${id}"`}
									loadData={{ Parent_ID: id }}
								/>
							) : null}
						</TabbedSectionContent>
					</TabbedSection>
				) : null}
			</FormWrapper>

			<BottomBar
				show={
					!id ||
					currentUser.Enable_Autosave === false ||
					currentUser.Enable_Autosave === 'false'
						? true
						: false
				}
				onSave={onSave}
				saveDisabled={
					(state.data && Object.keys(state.data).length === 0) ||
					Object.values(error).includes(true) ||
					state.status === 'saving' ||
					state.status === 'deleting'
				}
				onReset={onReset}
				resetDisabled={
					(state.data && Object.keys(state.data).length === 0) ||
					state.status === 'saving' ||
					state.status === 'deleting'
				}
			/>

			{/* Form specific action confirmation (e.g. Void, Delete) */}
			<ConfirmationDialog
				open={confirmationDialogOpen}
				title={confirmationDialogData.title}
				onBack={() => setConfirmationDialogOpen(false)}
				onConfirm={confirmationDialogData.onConfirm}
				confirmButtonColor={confirmationDialogData.confirmButtonColor}>
				{confirmationDialogData.children}
			</ConfirmationDialog>

			{/* Email Wizard) */}

			{/* Print Wizard */}

			{/* Search  */}
			<RenderPopup
				title={
					<Box sx={{ display: 'flex' }}>
						<DatabaseDefaultIcon form={'Serial_Number'} sx={{ mr: 0.75 }} />
						<Typography component='span'>
							Search Serial Number{' '}
							<Typography component='span' sx={{ fontWeight: 'bold' }}>
								{state.currentData.Value}
							</Typography>
						</Typography>
					</Box>
				}
				open={searchOpen}
				onClose={() => setSearchOpen(false)}>
				<Box>
					<Typography>Purchase Receive Line Items:</Typography>
					<PurchaseReceiveLineItemReport
						disableOpenOnRowClick
						disableRowRightClick
						variant='tab'
						maxHeight={maxHeight}
						forcedCriteria={`Serial_Number_Entry.contains("${state.currentData.Value}")`}
						ActionProps={{
							hideAdd: true,
							hideEdit: true,
							hideMassUpdate: true,
							hideDelete: true,
						}}
					/>
				</Box>
			</RenderPopup>

			{/* Toast messaging in lower right */}
			<ToastMessage data={toastData} />
			<SaveManager formDataState={state} />
		</Box>
	);
};
SerialNumberForm.propTypes = {
	formName: PropTypes.string.isRequired,
	id: PropTypes.string,
	loadData: PropTypes.object,
	resource: PropTypes.object,
	setAppBreadcrumb: PropTypes.func,
	onChange: PropTypes.func,
	massUpdating: PropTypes.bool,
	massUpdateRecordIds: PropTypes.array,
	uuid: PropTypes.string,
	maxHeight: PropTypes.number,
};

SerialNumberForm.defaultProps = {
	loadData: {},
	massUpdating: false,
	massUpdateRecordIds: [],
};

const Wrapper = (props) => {
	return (
		<React.Suspense fallback={<ContextCircularProgressLoader />}>
			<SerialNumberForm {...props} />
		</React.Suspense>
	);
};

export default Wrapper;
