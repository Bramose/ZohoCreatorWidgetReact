import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useRecoilValue } from 'recoil';
import { Box, Button, Stack, Typography } from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import DatabaseDefaultIcon from '../Helpers/DatabaseDefaultIcon';
import CustomTable from '../CustomTable/CustomTable';
import CustomDataTable from '../CustomDataTable/CustomDataTable';
import {
	sum,
	currency,
	intTryParse,
	zohoFilenameParserFromDownloadUrl,
	zohoDownloadUrlParser,
} from '../Helpers/functions';

//? Report Filter Columns
export const columns = [
	{
		field: 'Name',
		searchField: ['First_Name', 'Last_Name', 'Full_Name'],
		flex: 2,
		valueGetter: ({ row }) => row.First_Name + ' ' + row.Last_Name,
	},
	{
		field: 'Email',
		flex: 4,
	},
	{
		field: 'Phone',
		searchField: ['Direct_Phone', 'Cell_Phone'],
		flex: 4,
		valueGetter: ({ row }) => {

			const direct = row.Direct_Phone ? `Direct: ${row.Direct_Phone}` : ''; 
			const cell = row.Cell_Phone ? `Cell: ${row.Cell_Phone}` : ''; 

			if(direct && cell) {
				return `${direct} / ${cell}`;
			}

			if(direct) {
				return direct;
			}

			if(cell) {
				return cell;
			}

			return "";
		},
	},
	{
		field: 'Type',
		flex: 2,
		valueOptions: ['Account', 'Vendor', 'Subcontractor'],
	},
	{
		field: 'Affiliation',
		searchField: ['Accounts_Names'],
		flex: 4,
		valueGetter: ({ row }) => {
			if (row.Accounts) {
				return row.Accounts ? row.Accounts.map(x => x.display_value).join(', ') : '';
			}
			if (row.Vendor) {
				return row.Vendor.display_value;
			}
			if (row.Subcontractor) {
				return row.Subcontractor.display_value;
			}
		},
	},
	{
		field: 'Profile',
		searchField: 'Profile_Name',
		flex: 2,
		valueGetter: ({ value }) => value.display_value || '',
	},
	{
		field: 'ID',
		searchField: false,
		flex: 2,
		adminOnly: true,
	}
];

//? Add columns that will be used only for filtering
export const filterColumns = [...columns].sort((a, b) => {
	if (
		a.headerName
			? a.headerName
			: a.field < b.headerName
			? b.headerName
			: b.field
	) {
		return -1;
	} else if (
		a.headerName
			? a.headerName
			: a.field > b.headerName
			? b.headerName
			: b.field
	) {
		return 1;
	} else {
		return 0;
	}
});

const ContactReport = ({ maxHeight, variant, forcedCriteria, loadData, ...others }) => {
	return (
		<CustomDataTable
			{...others}
			formName='Contact'
			height={maxHeight - 16}
			forcedCriteria={forcedCriteria}
			loadDataOnAddNewRow={loadData}
			DataGridProps={{
				checkboxSelection: true,
				disableSelectionOnClick: true,
			}}
			ActionProps={{
				showMerge: true,
			}}
			WrapperProps={{
				elevation: 4,
			}}
			columns={columns}
			filterColumns={filterColumns}
			hideFilters={variant === 'tab'}
			hideSearch={variant === 'tab'}
		/>
	);
};

ContactReport.propTypes = {
	maxHeight: PropTypes.number,
	forcedCriteria: PropTypes.string,
	loadData: PropTypes.object,
	variant: PropTypes.oneOf(['tab']),
};

export default ContactReport;
