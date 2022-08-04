import '~styles/index.css';
import { Injectable, isDevMode, Component, ViewEncapsulation, ViewChild, Input, EventEmitter, ElementRef, Output, HostListener, NgModule } from '@angular/core';
import { __awaiter } from 'tslib';
import { InventoryService, MeasurementService, InventoryBinaryService, FetchClient, Realtime } from '@c8y/client';
import { DataGridComponent, AlertService, CoreModule, CommonModule, HOOK_COMPONENTS } from '@c8y/ngx-components';
import { skip } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import * as moment_ from 'moment';
import { BsModalRef, BsModalService, ModalModule } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChartsModule } from 'ng2-charts';
import { NgSelectModule } from '@ng-select/ng-select';

class GpLibRcaService {
    constructor() { }
}
GpLibRcaService.decorators = [
    { type: Injectable }
];
GpLibRcaService.ctorParameters = () => [];

class Commonc8yService {
    constructor(invSvc, msmtSvc, inventoryBinaryService, fetchClient) {
        this.invSvc = invSvc;
        this.msmtSvc = msmtSvc;
        this.inventoryBinaryService = inventoryBinaryService;
        this.fetchClient = fetchClient;
        this.devices = [];
    }
    getTargetObject(deviceId) {
        if (isDevMode()) {
            console.log('+-+- checking for ', deviceId);
        }
        return new Promise((resolve, reject) => {
            this.invSvc.detail(deviceId).then((resp) => {
                if (isDevMode()) {
                    console.log('+-+- DETAILS FOR MANAGED OBJECT ' + deviceId, resp);
                }
                if (resp.res.status === 200) {
                    resolve(resp.data);
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    /**
     * This service will recursively get all the child devices for the given device id and return a promise with the result list.
     *
     * @param id ID of the managed object to check for child devices
     * @param pageToGet Number of the page passed to the API
     * @param allDevices Child Devices already found
     */
    getChildDevices(id, pageToGet, allDevices) {
        const inventoryFilter = {
            // fragmentType: 'c8y_IsDevice',
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet,
        };
        if (!allDevices) {
            allDevices = { data: [], res: null };
        }
        return new Promise((resolve, reject) => {
            this.invSvc.childAssetsList(id, inventoryFilter).then((resp) => {
                if (resp.res.status === 200) {
                    if (resp.data && resp.data.length >= 0) {
                        allDevices.data.push.apply(allDevices.data, resp.data);
                        if (isDevMode()) {
                            console.log('+-+- checking on devices found\n', resp);
                        }
                        // response does not have totalPages... :(
                        // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                        if (resp.data.length < inventoryFilter.pageSize) {
                            resolve(allDevices);
                        }
                        else {
                            this.getChildDevices(id, resp.paging.nextPage, allDevices)
                                .then((np) => {
                                resolve(allDevices);
                            })
                                .catch((err) => reject(err));
                        }
                    }
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    // Regular expression for validation
    generateRegEx(input) {
        const name = input + '';
        const nameLower = name.toLowerCase();
        const nameUpper = name.toUpperCase();
        let regex = '*';
        const numRegex = new RegExp(/^([0-9]+)$/);
        const splCharRegex = new RegExp(/^([,._-]+)$/);
        for (let i = 0; i < name.length; i++) {
            if (name.charAt(i) === ' ') {
                regex += ' ';
            }
            else if (name.charAt(i).match(numRegex)) {
                regex += '[' + name.charAt(i) + ']';
            }
            else if (name.charAt(i).match(splCharRegex)) {
                regex += '[' + name.charAt(i) + ']';
            }
            else {
                regex += '[' + nameLower.charAt(i) + '|' + nameUpper.charAt(i) + ']';
            }
        }
        regex += '*';
        return regex;
    }
    // Get All devices based on query search parameter
    getAllDevices(pageToGet, searchName) {
        let inventoryFilter = {};
        inventoryFilter = {
            pageSize: 10,
            withTotalPages: true,
            currentPage: pageToGet,
        };
        if (searchName) {
            inventoryFilter['query'] = `$filter=(has(c8y_IsDevice) and (name eq '${this.generateRegEx(searchName)}'))`;
        }
        else {
            inventoryFilter['query'] = `$filter=(has(c8y_IsDevice))`;
        }
        return new Promise((resolve, reject) => {
            this.invSvc.list(inventoryFilter).then((resp) => {
                if (resp.res.status === 200) {
                    resolve(resp);
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    /**
     * This service will recursively get all the child devices for the given device id.
     *
     * @param id ID of the managed object to check for child additions
     * @param pageToGet Number of the page passed to the API
     * @param allAdditions Child additions already found... the newly found additions will be aded here
     * @param type Type of addition to return... the service does not use the "fragmentType"
     */
    getChildAdditions(id, pageToGet, allAdditions, type) {
        const inventoryFilter = {
            // fragmentType: type,
            // valueFragmentType: type,
            // type: type,
            pageSize: 15,
            withTotalPages: true,
            currentPage: pageToGet,
        };
        if (!allAdditions) {
            allAdditions = { data: [], res: null };
        }
        return new Promise((resolve, reject) => {
            this.invSvc.childAdditionsList(id, inventoryFilter).then((resp) => {
                if (resp.res.status === 200) {
                    if (resp.data && resp.data.length >= 0) {
                        allAdditions.data.push.apply(allAdditions.data, resp.data);
                        if (isDevMode()) {
                            console.log('+-+- checking on additions found\n', resp);
                        }
                        // response does not have totalPages... :(
                        // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                        if (resp.data.length < inventoryFilter.pageSize) {
                            allAdditions.data = allAdditions.data.filter((d) => {
                                return d.type && d.type.localeCompare(type) === 0;
                            });
                            resolve(allAdditions);
                        }
                        else {
                            this.getChildAdditions(id, resp.paging.nextPage, allAdditions, type)
                                .then((np) => {
                                resolve(allAdditions);
                            })
                                .catch((err) => reject(err));
                        }
                    }
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    /**
     * Get Inventory list based on type
     */
    getInventoryItems(pageToGet, allInventoryItems, type) {
        let inventoryFilter;
        inventoryFilter = {
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet,
            query: `type eq ${type}`,
        };
        if (!allInventoryItems) {
            allInventoryItems = { data: [], res: null };
        }
        return new Promise((resolve, reject) => {
            this.invSvc.list(inventoryFilter).then((resp) => {
                if (resp.res.status === 200) {
                    if (resp.data && resp.data.length >= 0) {
                        allInventoryItems.data.push.apply(allInventoryItems.data, resp.data);
                        if (isDevMode()) {
                            console.log('+-+- checking on inventory items found\n', resp);
                        }
                        // response does not have totalPages... :(
                        // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                        if (resp.data.length < inventoryFilter.pageSize) {
                            // remove the additions that does not fit into the given type, if any
                            resolve(allInventoryItems);
                        }
                        else {
                            this.getInventoryItems(resp.paging.nextPage, allInventoryItems, type)
                                .then((np) => {
                                resolve(allInventoryItems);
                            })
                                .catch((err) => reject(err));
                        }
                    }
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    getSpecificFragmentDevices(pageToGet, searchName) {
        let inventoryFilter = {};
        inventoryFilter = {
            pageSize: 10,
            withTotalPages: true,
            currentPage: pageToGet,
        };
        if (searchName) {
            inventoryFilter['query'] = `$filter=(has(c8y_IsDevice) and (has(c8y_AmberSensorConfiguration)) and (name eq '${this.generateRegEx(searchName)}'))`;
        }
        else {
            inventoryFilter['query'] = `$filter=(has(c8y_IsDevice)) and (has(c8y_AmberSensorConfiguration)) `;
        }
        return new Promise((resolve, reject) => {
            this.invSvc.list(inventoryFilter).then((resp) => {
                if (resp.res.status === 200) {
                    resolve(resp);
                }
                else {
                    reject(resp);
                }
            });
        });
    }
    /**
     * Creates the given object using the InventoryService.
     *
     * @param managedObject Object to be created
     * @returns Promise object with the result of the service call
     */
    createManagedObject(managedObject) {
        if (isDevMode()) {
            console.log('+-+- CREATING MANAGED OBJECT ');
        }
        return this.invSvc.create(managedObject);
        /* return new Promise(
                 (resolve, reject) => {
                     this.invSvc.create(managedObject)
                         .then((resp) => {
                             if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT CREATION', resp); }
                             // successful return code is 201 Created
                             if (resp.res.status === 201) {
                                 resolve(resp.data);
                             } else {
                                 reject(resp);
                             }
                         });
                 }); */
    }
    updateManagedObject(managedObject) {
        if (isDevMode()) {
            console.log('+-+- CREATING MANAGED OBJECT ');
        }
        return this.invSvc.update(managedObject);
    }
    deleteManagedObject(id) {
        return this.invSvc.delete(id);
    }
    /**
     *
     * @param input Validate JSON Input
     */
    isValidJson(input) {
        try {
            if (input) {
                const o = JSON.parse(input);
                if (o && o.constructor === Object) {
                    return o;
                }
            }
        }
        catch (e) { }
        return false;
    }
    /**
     * This method used in configuration of this widget to populate available measurements for given device id or group id
     */
    getFragmentSeries(aDevice, fragementList, observableFragment$) {
        let deviceList = null;
        if (aDevice) {
            // get all child assets for the target object, defined in the configuration
            this.getTargetObject(aDevice.id)
                .then((mo) => __awaiter(this, void 0, void 0, function* () {
                if (mo &&
                    mo.type &&
                    (mo.type.localeCompare('c8y_DeviceGroup') === 0 ||
                        mo.type.localeCompare('c8y_DeviceSubgroup') === 0)) {
                    // GET child devices
                    this.getChildDevices(aDevice.id, 1, deviceList)
                        .then((deviceFound) => __awaiter(this, void 0, void 0, function* () {
                        deviceList = deviceFound.data;
                        const uniqueDeviceList = deviceList
                            .filter((device, index, self) => index === self.findIndex((t) => t.type === device.type))
                            .map((device) => device.id);
                        for (const device of uniqueDeviceList) {
                            if (isDevMode()) {
                                console.log('+-+- CHECKING Series FOR: ', device);
                            }
                            const supportedMeasurements = yield this.getSupportedMeasurementsForDevice(device);
                            if (isDevMode()) {
                                console.log('+-+- supportedMeasurements FOR... ' + device, supportedMeasurements);
                            }
                            const fragmentSeries = yield this.getSupportedSeriesForDevice(device);
                            if (isDevMode()) {
                                console.log('+-+- FragmentSeries FOR... ' + device, fragmentSeries);
                            }
                            if (fragmentSeries &&
                                fragmentSeries.c8y_SupportedSeries &&
                                supportedMeasurements &&
                                supportedMeasurements.c8y_SupportedMeasurements) {
                                fragementList = this.getFragementList(fragementList, fragmentSeries.c8y_SupportedSeries, supportedMeasurements.c8y_SupportedMeasurements);
                            }
                        }
                        observableFragment$.next(fragementList);
                    }))
                        .catch((err) => {
                        if (isDevMode()) {
                            console.log('+-+- ERROR FOUND WHILE GETTING CHILD DEVICES... ', err);
                        }
                    });
                }
                else {
                    if (isDevMode()) {
                        console.log('+-+- CHECKING MEASUREMENTS FOR: ', aDevice.id);
                    }
                    const supportedMeasurements = yield this.getSupportedMeasurementsForDevice(aDevice.id);
                    if (isDevMode()) {
                        console.log('+-+- supportedMeasurements FOR... ' + aDevice.id, supportedMeasurements);
                    }
                    const fragmentSeries = yield this.getSupportedSeriesForDevice(aDevice.id);
                    if (isDevMode()) {
                        console.log('+-+- FragmentSeries FOR... ' + aDevice.id, fragmentSeries);
                    }
                    if (fragmentSeries &&
                        fragmentSeries.c8y_SupportedSeries &&
                        supportedMeasurements &&
                        supportedMeasurements.c8y_SupportedMeasurements) {
                        fragementList = this.getFragementList(fragementList, fragmentSeries.c8y_SupportedSeries, supportedMeasurements.c8y_SupportedMeasurements);
                    }
                    observableFragment$.next(fragementList);
                }
            }))
                .catch((err) => {
                if (isDevMode()) {
                    console.log('+-+- ERROR while getting Device details ', err);
                }
            });
        }
    }
    // This method populate measurementList/fragementList based on series and measurements
    getFragementList(fragementList, fragmentSeries, supportedMeasurements) {
        if (fragementList) {
            fragmentSeries.forEach((fs) => {
                const measurementType = supportedMeasurements.filter((smFilter) => fs.indexOf(smFilter) !== -1);
                if (measurementType && measurementType.length > 0) {
                    const fsName = fs.replace(measurementType[0] + '.', '');
                    const fsType = measurementType[0];
                    const existingF = fragementList.find((sm) => sm.type === fsType && sm.name === fsName);
                    if (!existingF || existingF == null) {
                        fragementList.push({
                            name: fsName,
                            type: fsType,
                            description: fs,
                        });
                    }
                }
            });
        }
        else {
            fragmentSeries.forEach((fs) => {
                const measurementType = supportedMeasurements.filter((smFilter) => fs.indexOf(smFilter) !== -1);
                if (measurementType && measurementType.length > 0) {
                    const fsName = fs.replace(measurementType[0] + '.', '');
                    const fsType = measurementType[0];
                    fragementList.push({
                        name: fsName,
                        type: fsType,
                        description: fs,
                    });
                }
            });
        }
        return fragementList;
    }
    // Get Supported Series for given device id/
    getSupportedSeriesForDevice(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            };
            return yield (yield this.fetchClient.fetch(`/inventory/managedObjects/${deviceId}/supportedSeries`, options)).json();
        });
    }
    // Get Supported Measurements for given device Id
    getSupportedMeasurementsForDevice(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            };
            return yield (yield this.fetchClient.fetch(`/inventory/managedObjects/${deviceId}/supportedMeasurements`, options)).json();
        });
    }
    // tslint:disable-next-line:max-line-length
    getLastMeasurementForSource(sourceId, dateFrom, dateTo, type, series) {
        const msmtFilter = {
            pageSize: 20,
            valueFragmentSeries: series,
            valueFragmentType: type,
            dateFrom,
            dateTo,
            revert: true,
            source: sourceId,
        };
        return new Promise((resolve) => {
            this.msmtSvc.list(msmtFilter).then((resp) => {
                resolve(resp);
            });
        });
    }
    getMeasurementForSource(sourceId, dateFrom, dateTo, type) {
        const msmtFilter = {
            pageSize: 10,
            valueFragmentType: type,
            dateFrom,
            dateTo,
            revert: true,
            source: sourceId,
        };
        return new Promise((resolve) => {
            this.msmtSvc.list(msmtFilter).then((resp) => {
                resolve(resp);
            });
        });
    }
}
Commonc8yService.decorators = [
    { type: Injectable }
];
Commonc8yService.ctorParameters = () => [
    { type: InventoryService },
    { type: MeasurementService },
    { type: InventoryBinaryService },
    { type: FetchClient }
];

class RCAViewModalComponent {
    constructor(cmonSvc, bsModalRef, bsModalService) {
        this.cmonSvc = cmonSvc;
        this.bsModalRef = bsModalRef;
        this.bsModalService = bsModalService;
        this.barChartType = '';
        this.barChartColors = [];
        this.colorsArr = [];
        this.barChartOptions = {
            scaleShowVerticalLines: false,
            responsive: true,
            legend: {
                title: {
                    display: true,
                    text: 'RCA',
                },
                position: 'top',
                display: true,
            },
            scales: {},
            elements: {
                line: {
                    fill: false,
                },
            },
        };
        this.measurementList = [];
        this.observableMeasurements$ = new BehaviorSubject(this.measurementList);
    }
    ngOnInit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.barChartOptions['scales'] = {
                xAxes: [
                    {
                        ticks: {
                            beginAtZero: true,
                            font: {
                                size: 6,
                            },
                        },
                    },
                ],
                yAxes: [
                    {
                        ticks: {
                            beginAtZero: true,
                            stepSize: 0.2,
                        },
                    },
                ],
            };
            this.createchart();
        });
    }
    createchart() {
        return __awaiter(this, void 0, void 0, function* () {
            let k;
            const dataValues = [];
            const labels = [];
            const dataResult = {};
            this.barChartLabels = [];
            this.barChartData = [];
            this.rcaDataset.forEach((iteam) => {
                labels.push(iteam.key);
                dataValues.push(iteam.value);
            });
            console.log('dataValues ', dataValues);
            let dlabels = labels.map((l) => l.split('-'));
            let vlabels = [];
            dlabels.forEach((label) => {
                vlabels.push(label[1]);
            });
            if (dataValues.length > 0) {
                this.barChartLabels = vlabels;
                this.barChartData = [{ data: dataValues, label: 'Amber Route Cause' }];
                this.barChartType = 'bar';
                this.dataLoaded = Promise.resolve(true);
            }
            this.setChartColors();
            console.log('barChartData', this.barChartData);
        });
    }
    setChartColors() {
        let borderColor = [];
        if (this.configcolor !== undefined) {
            this.colorsArr = this.configcolor.split(';');
            if (this.configborderColor === undefined || this.configborderColor === '') {
                borderColor = [];
            }
            else {
                borderColor = this.configborderColor.split(';');
            }
            if (this.configcolor === '') {
                this.barChartColors = [];
            }
            else if (this.colorsArr.length >= this.barChartData.length) {
                for (let k = 0; k < this.barChartData.length; k++) {
                    this.barChartColors.push({
                        backgroundColor: this.colorsArr[k],
                        // @ts-ignore
                        borderColor,
                    });
                }
            }
            else if (this.barChartData[0].data.length <= this.colorsArr.length) {
                if (borderColor.length < this.barChartData[0].data.length) {
                    borderColor = [];
                }
                this.barChartColors = [
                    {
                        // @ts-ignore
                        backgroundColor: this.colorsArr,
                        // @ts-ignore
                        borderColor,
                    },
                ];
            }
            else {
                this.barChartColors = [];
            }
        }
        else {
            this.barChartColors = [];
        }
    }
    onCancelClicked() {
        this.bsModalRef.hide();
    }
}
RCAViewModalComponent.decorators = [
    { type: Component, args: [{
                selector: 'rca-view-modal',
                template: "<div class=\"modal-header text-center bg-primary\">\n  <div ng-transclude=\"header\">\n    <header class=\"text-white\">\n      <h4 class=\"text-uppercase m-0\" style=\"letter-spacing: 0.15em\" translate=\"\">RCA</h4>\n    </header>\n  </div>\n</div>\n<div class=\"modal-body\">\n  <div *ngIf=\"dataLoaded | async\">\n    <div style=\"display: block\">\n      <canvas\n        baseChart\n        [datasets]=\"barChartData\"\n        [labels]=\"barChartLabels\"\n        [colors]=\"barChartColors\"\n        [options]=\"barChartOptions\"\n        [chartType]=\"barChartType\"\n      >\n      </canvas>\n    </div>\n  </div>\n</div>\n<div class=\"modal-footer\">\n  <button type=\"button\" class=\"btn btn-default\" (click)=\"onCancelClicked()\">Cancel</button>\n</div>\n",
                encapsulation: ViewEncapsulation.None,
                styles: ["eaas-select-plan-modal c8y-data-grid th.cdk-header-cell.cdk-column-checkbox label.c8y-checkbox span{display:none!important}eaas-select-plan-modal c8y-data-grid table.large-padding{padding:0!important}eaas-select-plan-modal .modal-body{padding:0}"]
            },] }
];
RCAViewModalComponent.ctorParameters = () => [
    { type: Commonc8yService },
    { type: BsModalRef },
    { type: BsModalService }
];
RCAViewModalComponent.propDecorators = {
    device: [{ type: ViewChild, args: [DataGridComponent, { static: true },] }, { type: Input }],
    label: [{ type: Input }],
    value: [{ type: Input }],
    rcaDataset: [{ type: Input }],
    configcolor: [{ type: Input }],
    configborderColor: [{ type: Input }]
};

const moment = moment_;
class GpLibRcaComponent {
    constructor(cmonSvc, alertervice, measurementService, formBuilder, modalService, realTimeService) {
        this.cmonSvc = cmonSvc;
        this.alertervice = alertervice;
        this.measurementService = measurementService;
        this.formBuilder = formBuilder;
        this.modalService = modalService;
        this.realTimeService = realTimeService;
        this.measurementList = [];
        this.observableMeasurements$ = new BehaviorSubject(this.measurementList);
        this.barChartOptions = {
            scaleShowVerticalLines: false,
            responsive: true,
            legend: {
                position: 'top',
                display: true,
            },
            scales: {},
            elements: {
                line: {
                    fill: false,
                },
            },
        };
        this.barChartType = '';
        this.barChartColors = [];
        this.colorsArr = [];
        this.rcaDataset = [];
        this.realtimeState = true;
        this.allSubscriptions = [];
    }
    ngOnInit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.deviceId = this.config.device.id;
            this.selectedRCAMeasurements = this.config.selectedRCAMeasurements;
            this.interval = this.config.interval;
            // this.interval = "Last Hour";
            //     this.selectedRCAMeasurements = [
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_0",
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_1",
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_2",
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_3",
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_4",
            //     "c8y_AmberRootCause.c8y_SignalStrength-actual_current_5",
            // ];
            // this.deviceId = 8492;
            //   this.selectedRCAMeasurements = [
            //     "c8y_AmberRootCause.c8y_comp-gb_hss_de",
            //     "c8y_AmberRootCause.c8y_comp-gb_hss_nde",
            //     "c8y_AmberRootCause.c8y_comp-comp_female_nde",
            //     "c8y_AmberRootCause.c8y_comp-gb_lss_nde",
            //     "c8y_AmberRootCause.c8y_comp-gb_lss_de",
            //     "c8y_AmberRootCause.c8y_comp-mtr_nde",
            //     "c8y_AmberRootCause.c8y_comp-mtr_de",
            //     "c8y_AmberRootCause.c8y_comp-comp_male_de",
            //     "c8y_AmberRootCause.c8y_comp-comp_male_nde",
            //     "c8y_AmberRootCause.c8y_comp-comp_female_de"
            // ];
            //   this.deviceId = 1380;
            this.barChartOptions['scales'] = {
                xAxes: [
                    {
                        ticks: {
                            beginAtZero: true,
                            font: {
                                size: 6,
                            },
                        },
                    },
                ],
                yAxes: [
                    {
                        min: 0,
                        max: 2,
                        ticks: {
                            beginAtZero: true,
                            stepSize: 1,
                        },
                    },
                ],
            };
            yield this.LoadDeviceData();
            if (this.realtimeState) {
                this.allSubscriptions = [];
                this.realtTimeMeasurements(this.deviceId);
            }
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            this.clearSubscriptions();
            yield this.LoadDeviceData();
        });
    }
    /** Toggles the realtime state */
    toggle() {
        return __awaiter(this, void 0, void 0, function* () {
            this.realtimeState = !this.realtimeState;
            if (this.realtimeState) {
                this.allSubscriptions = [];
                this.realtTimeMeasurements(this.deviceId);
            }
            else {
                this.clearSubscriptions();
            }
        });
    }
    realtTimeMeasurements(deviceId) {
        const measurementChannel = `/measurements/${deviceId}`;
        const detailSubs = this.realTimeService.subscribe(measurementChannel, (response) => __awaiter(this, void 0, void 0, function* () {
            if (response && response.data) {
                const measurementData = response.data;
                if (measurementData.data) {
                    const msmt = measurementData.data;
                    if (msmt && msmt[this.valueFragmentType] && msmt[this.valueFragmentType][this.valueFragmentSeries]) {
                        if (isDevMode()) {
                            console.log("msmt", msmt);
                        }
                        yield this.LoadDeviceData();
                    }
                }
            }
        }));
        if (this.realtimeState) {
            this.allSubscriptions.push({
                id: this.deviceId,
                subs: detailSubs,
                type: 'Realtime',
            });
        }
        else {
            this.realTimeService.unsubscribe(detailSubs);
        }
    }
    clearSubscriptions() {
        if (this.allSubscriptions) {
            this.allSubscriptions.forEach((s) => {
                this.realTimeService.unsubscribe(s.subs);
            });
        }
    }
    LoadDeviceData() {
        return __awaiter(this, void 0, void 0, function* () {
            this.device = yield this.cmonSvc.getTargetObject(this.deviceId);
            let response = yield this.cmonSvc.getSpecificFragmentDevices(1, this.device.name);
            if (isDevMode()) {
                console.log('+-+- MANAGED OBJECT WITH AMBER FRAGMENT', response.data);
            }
            if (response.data) {
                yield this.getmeasurement();
            }
            else {
                this.alertervice.danger('Device is not configured to Amber');
            }
        });
    }
    checkFargmentSeries() {
        return __awaiter(this, void 0, void 0, function* () {
            this.measurementList.forEach((ml) => {
                if (ml.name === 'ad') {
                    if (isDevMode()) {
                        console.log('+-+-c8y_ad.ad measurement exist');
                    }
                    this.valueFragmentType = 'c8y_ad';
                    this.valueFragmentSeries = 'ad';
                }
            });
            if (this.valueFragmentSeries && this.valueFragmentType && this.device.id) {
                yield this.createChart(this.device.id);
            }
        });
    }
    getmeasurement() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.device && this.device.id) {
                const response = yield this.cmonSvc.getTargetObject(this.device.id);
                yield this.cmonSvc.getFragmentSeries(response, this.measurementList, this.observableMeasurements$);
                if (!this.measurementType) {
                    this.measurementType = {};
                }
                else {
                    if (this.measurementTypeList.length > 0) {
                        let measurementType;
                        for (measurementType of this.measurementTypeList) {
                            if (this.measurementType.name === measurementType.name) {
                                this.measurementType = measurementType;
                            }
                        }
                    }
                }
                // Get the measurements as soon as device or group is selected
                this.measurementSubs = this.observableMeasurements$
                    .pipe(skip(1))
                    // tslint:disable-next-line: deprecation
                    .subscribe((mes) => __awaiter(this, void 0, void 0, function* () {
                    this.measurementTypeList = [];
                    if (mes && mes.length > 0) {
                        this.measurementTypeList = [...mes];
                        if (isDevMode()) {
                            console.log('+-+- CHECKING LIST MEASUREMENTS FOR: ', this.measurementTypeList);
                        }
                        yield this.checkFargmentSeries();
                    }
                }));
            }
        });
    }
    /** Fetches the events using Event Service for the given device and particular event type */
    createChart(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = moment();
            var totime = moment(now, 'YYYY-MM-DD HH:mm:ss').format();
            let dataSet = [];
            var fromtime;
            if (this.interval === 'Last Hour') {
                fromtime = moment(totime).subtract(2, 'hours').format();
            }
            else if (this.interval === 'Last Minute') {
                fromtime = moment(totime).subtract(1, 'minutes').format();
            }
            else if (this.interval === '' || this.interval === undefined) {
                fromtime = moment(totime).subtract(1, 'hours').format();
            }
            if (isDevMode()) {
                console.log('fromtime - totime', fromtime);
            }
            const response = (yield this.cmonSvc.getLastMeasurementForSource(deviceId, fromtime, totime, this.valueFragmentType, this.valueFragmentSeries));
            if (isDevMode()) {
                console.log('+-+- Measurement data: ', response);
            }
            if (response && response.data.length > 0) {
                response.data.forEach((mes) => {
                    if (mes &&
                        mes[this.valueFragmentType] &&
                        mes[this.valueFragmentType][this.valueFragmentSeries]) {
                        const date = moment(mes.time).format('YYYY-MM-DD HH:mm:ss');
                        const value = mes[this.valueFragmentType][this.valueFragmentSeries].value;
                        let arr = { key: date, value: value };
                        dataSet.push(arr);
                    }
                });
                if (isDevMode()) {
                    console.log('dataset', dataSet);
                }
                dataSet.reverse();
                if (isDevMode()) {
                    console.log('+-+- val: ', dataSet);
                }
                let k;
                const dataValues = [];
                const labels = [];
                const dataResult = {};
                this.barChartLabels = [];
                this.barChartData = [];
                dataSet.forEach((iteam) => {
                    labels.push(moment(iteam.key).format('YYYY-MM-DD HH:mm:ss'));
                    dataValues.push(iteam.value);
                });
                if (isDevMode()) {
                    console.log('dataValues ', dataValues);
                    console.log('labels', labels);
                }
                let dlabels = labels.map((l) => l.split(' '));
                if (dataValues.length > 0) {
                    this.barChartLabels = dlabels;
                    this.barChartData = [{ data: dataValues, label: 'AD' }];
                    this.barChartType = 'line';
                    this.dataLoaded = Promise.resolve(true);
                }
                this.setChartColors();
                if (isDevMode()) {
                    console.log('barChartData', this.barChartData);
                }
            }
        });
    }
    chartClicked(event) {
        if (isDevMode()) {
            console.log('event', event);
        }
        if (event.active.length > 0) {
            const chart = event.active[0]._chart;
            const activePoints = chart.getElementsAtEventForMode(event.event, 'point', chart.options);
            const firstPoint = activePoints[0];
            const label = chart.data.labels[firstPoint._index];
            const value = chart.data.datasets[firstPoint._datasetIndex].data[firstPoint._index];
            if (value > 0) {
                this.displayModalDialog(label, value);
            }
        }
        else {
            if (isDevMode()) {
                console.log('there is no active element');
            }
            return;
        }
    }
    getRCAValue(time, setfalg) {
        return __awaiter(this, void 0, void 0, function* () {
            this.rcaDataset = [];
            let fragment;
            let series = [];
            let response;
            if (this.selectedRCAMeasurements.length > 0) {
                this.selectedRCAMeasurements.forEach((fs) => __awaiter(this, void 0, void 0, function* () {
                    let values = fs.split('.', 2);
                    fragment = values[0];
                    series.push(values[1]);
                }));
                if (setfalg === 1) {
                    var fromtime = moment(time).subtract(1, 'minutes').format();
                    var totime = moment(time, 'YYYY-MM-DD HH:mm:ss').format();
                    response = (yield this.cmonSvc.getMeasurementForSource(this.deviceId, fromtime, totime, fragment));
                }
                else if (setfalg === 0) {
                    var totime = moment(time).add(1, 'minutes').format();
                    var fromtime = moment(time, 'YYYY-MM-DD HH:mm:ss').format();
                    response = (yield this.cmonSvc.getMeasurementForSource(this.deviceId, fromtime, totime, fragment));
                }
                if (isDevMode()) {
                    console.log('response', response);
                }
                if (response && response.data.length === 1) {
                    response.data.forEach((mes) => {
                        series.forEach((series) => {
                            if (mes && mes[fragment]) {
                                const value = mes[fragment][series].value;
                                let arr = { key: series, value: value };
                                this.rcaDataset.push(arr);
                            }
                        });
                    });
                }
                else if (response && response.data.length > 1) {
                    const resp = response.data[response.data.length - 1];
                    series.forEach((series) => {
                        if (series) {
                            const value = resp[fragment][series].value;
                            let arr = { key: series, value: value };
                            this.rcaDataset.push(arr);
                        }
                    });
                }
            }
        });
    }
    displayModalDialog(time, value) {
        return __awaiter(this, void 0, void 0, function* () {
            let ctime = time.join(' ');
            let dataset;
            let setflag = 1;
            yield this.getRCAValue(ctime, setflag);
            if (isDevMode()) {
                console.log('rcaDataset', this.rcaDataset);
            }
            if (this.rcaDataset.length === 0) {
                setflag = 0;
                yield this.getRCAValue(ctime, setflag);
                if (isDevMode()) {
                    console.log('rcaDataset inner fnction', this.rcaDataset);
                }
            }
            const initialState = {
                device: this.deviceId,
                time: ctime,
                value: value,
                rcaDataset: this.rcaDataset,
                configcolor: this.config.color,
                configborderColor: this.config.borderColor,
            };
            this.bsModalRefOption = this.modalService.show(RCAViewModalComponent, {
                initialState,
            });
        });
    }
    setChartColors() {
        let borderColor = [];
        if (this.config.color !== undefined) {
            this.colorsArr = this.config.color.split(';');
            if (this.config.borderColor === undefined || this.config.borderColor === '') {
                borderColor = [];
            }
            else {
                borderColor = this.config.borderColor.split(';');
            }
            if (this.config.color === '') {
                this.barChartColors = [];
            }
            else if (this.colorsArr.length >= this.barChartData.length) {
                for (let k = 0; k < this.barChartData.length; k++) {
                    this.barChartColors.push({
                        backgroundColor: this.colorsArr[k],
                        // @ts-ignore
                        borderColor,
                    });
                }
            }
            else if (this.barChartData[0].data.length <= this.colorsArr.length) {
                if (borderColor.length < this.barChartData[0].data.length) {
                    borderColor = [];
                }
                this.barChartColors = [
                    {
                        // @ts-ignore
                        backgroundColor: this.colorsArr,
                        // @ts-ignore
                        borderColor,
                    },
                ];
            }
            else {
                this.barChartColors = [];
            }
        }
        else {
            this.barChartColors = [];
        }
    }
    ngOnDestroy() {
        this.clearSubscriptions();
    }
}
GpLibRcaComponent.decorators = [
    { type: Component, args: [{
                selector: 'lib-gp-lib-rca',
                template: "<div>\n  <div style=\"height: 40px\">\n    <div style=\"float: right; margin-right: 10px\">\n      <button\n        type=\"button\"\n        class=\"btn btn-link c8y-realtime\"\n        title=\"Toggle realtime\"\n        (click)=\"toggle()\"\n      >\n        <span [ngClass]=\"realtimeState ? 'c8y-pulse active' : 'c8y-pulse inactive'\"></span>\n        <span>Realtime</span>\n      </button>\n      <button\n        style=\"color: #1776bf; margin-right: 5px\"\n        type=\"button\"\n        class=\"btn btn-clean\"\n        (click)=\"refresh()\"\n      >\n        <i c8yIcon=\"refresh\"></i>\n      </button>\n    </div>\n  </div>\n  <div *ngIf=\"dataLoaded | async\">\n    <div style=\"display: block\">\n      <canvas\n        baseChart\n        [datasets]=\"barChartData\"\n        [labels]=\"barChartLabels\"\n        [colors]=\"barChartColors\"\n        [options]=\"barChartOptions\"\n        [chartType]=\"barChartType\"\n        (chartClick)=\"chartClicked($event)\"\n      >\n      </canvas>\n    </div>\n  </div>\n</div>\n",
                styles: [""]
            },] }
];
GpLibRcaComponent.ctorParameters = () => [
    { type: Commonc8yService },
    { type: AlertService },
    { type: MeasurementService },
    { type: FormBuilder },
    { type: BsModalService },
    { type: Realtime }
];
GpLibRcaComponent.propDecorators = {
    config: [{ type: Input }]
};

class GpLibRcaConfigComponent {
    constructor(cmonSvc, alertervice, measurementService, formBuilder) {
        this.cmonSvc = cmonSvc;
        this.alertervice = alertervice;
        this.measurementService = measurementService;
        this.formBuilder = formBuilder;
        this.config = {};
        this.measurementRCAList = [];
        this.observableMeasurements$ = new BehaviorSubject(this.measurementRCAList);
        this.isOpenCP = false;
        this.borderCP = false;
        this.rcaMeasuremntDeviceForm = new FormGroup({
            rcadevicemeasure: new FormControl(),
            intervalSelect: new FormControl(),
            chartcolor: new FormControl(),
            bordercolor: new FormControl(),
        });
    }
    ngOnInit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.device && this.config.device.id) {
                this.deviceId = this.config.device.id;
                yield this.getmeasurement();
            }
        });
    }
    getmeasurement() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.deviceId) {
                const response = yield this.cmonSvc.getTargetObject(this.deviceId);
                yield this.cmonSvc.getFragmentSeries(response, this.measurementRCAList, this.observableMeasurements$);
                if (!this.measurementRCAType) {
                    this.measurementRCAType = {};
                }
                else {
                    if (this.ListMeasurementType.length > 0) {
                        let measurementType;
                        for (measurementType of this.ListMeasurementType) {
                            if (this.measurementRCAType.name === measurementType.name) {
                                this.measurementRCAType = measurementType;
                            }
                        }
                    }
                }
                // Get the measurements as soon as device or group is selected
                this.measurementSubs = this.observableMeasurements$
                    .pipe(skip(1))
                    // tslint:disable-next-line: deprecation
                    .subscribe((mes) => __awaiter(this, void 0, void 0, function* () {
                    this.ListMeasurementType = [];
                    if (mes && mes.length > 0) {
                        this.ListMeasurementType = [...mes];
                        if (isDevMode()) {
                            console.log('+-+- CHECKING LIST MEASUREMENTS FOR: ', this.ListMeasurementType);
                        }
                    }
                }));
            }
        });
    }
    invokeSetRCA() {
        if (this.config.selectedRCAMeasurements.length > 0) {
            if (isDevMode()) {
                console.log('Selected RCA Measurements', this.config.selectedRCAMeasurements);
            }
        }
    }
    openColorPicker() {
        if (!this.isOpenCP) {
            this.isOpenCP = true;
        }
    }
    openBorderColorPicker() {
        if (!this.borderCP) {
            this.borderCP = true;
        }
    }
    closeColorPicker() {
        if (this.isOpenCP) {
            this.isOpenCP = false;
        }
    }
    closeBorderColorPicker() {
        if (this.borderCP) {
            this.borderCP = false;
        }
    }
    setSelectedColor(value) {
        if (this.config.color) {
            this.config.color = this.config.color + ';' + value;
        }
        else {
            this.config.color = value;
        }
    }
    setSelectedBorderColor(value) {
        if (this.config.borderColor) {
            this.config.borderColor = this.config.borderColor + ';' + value;
        }
        else {
            this.config.borderColor = value;
        }
    }
    ngDoCheck() {
        if (this.config.device && this.config.device.id !== this.deviceId) {
            this.deviceId = this.config.device.id;
            this.ListMeasurementType = [];
            this.getmeasurement();
        }
    }
}
GpLibRcaConfigComponent.decorators = [
    { type: Component, args: [{
                selector: 'lib-gp-lib-config-rca',
                template: "<form [formGroup]=\"rcaMeasuremntDeviceForm\">\n  <div bg-white card-block large-padding>\n    <label style=\"padding-top: 20px\" for=\"Measurements\" translate=\"\">Select RCA Measurement</label>\n    <div class=\"form-group\">\n      <ng-select\n        required\n        [items]=\"ListMeasurementType\"\n        bindLabel=\"description\"\n        bindValue=\"description\"\n        name=\"measurementRCASelect\"\n        required\n        [multiple]=\"true\"\n        [closeOnSelect]=\"false\"\n        [searchable]=\"true\"\n        placeholder=\"Select Measurements\"\n        [(ngModel)]=\"config.selectedRCAMeasurements\"\n        formControlName=\"rcadevicemeasure\"\n        (change)=\"invokeSetRCA()\"\n      >\n      </ng-select>\n    </div>\n  </div>\n  <div class=\"form-group\">\n    <label for=\"intervalSelect\">Interval (max.20 measurements considered)</label>\n    <div class=\"c8y-select-wrapper\">\n      <select\n        formControlName=\"intervalSelect\"\n        id=\"intervalSelect\"\n        class=\"form-control\"\n        [(ngModel)]=\"config.interval\"\n      >\n        <option>Select\u2026</option>\n        <option>Last Hour</option>\n        <option>Last Minute</option>\n      </select>\n      <span></span>\n    </div>\n  </div>\n  <div style=\"display: flex\">\n    <div style=\"flex-grow: 1; margin-right: 5px\">\n      <label translate>Chart Color</label>\n      <input\n        formControlName=\"chartcolor\"\n        class=\"form-control\"\n        type=\"text\"\n        id=\"colorInput\"\n        name=\"config.color\"\n        (click)=\"openColorPicker()\"\n        style=\"width: 100%\"\n        [(ngModel)]=\"config.color\"\n        placeholder=\"Color code i.e #0899CC or leave blank for default colors\"\n      />\n      <app-color-picker\n        [ngClass]=\"isOpenCP ? 'colorPickerModal' : 'hideColorPicker'\"\n        (closeColorPicker)=\"closeColorPicker()\"\n        (colorSet)=\"setSelectedColor($event)\"\n      ></app-color-picker>\n    </div>\n    <div style=\"flex-grow: 1; margin-right: 5px\">\n      <label translate>Border Color</label>\n      <input\n        formControlName=\"bordercolor\"\n        class=\"form-control\"\n        type=\"text\"\n        id=\"colorInputBorder\"\n        name=\"config.borderColor\"\n        (click)=\"openBorderColorPicker()\"\n        style=\"width: 100%\"\n        [(ngModel)]=\"config.borderColor\"\n        placeholder=\"Choose border color\"\n      />\n      <app-color-picker\n        [ngClass]=\"borderCP ? 'colorPickerModal' : 'hideColorPicker'\"\n        (closeColorPicker)=\"closeBorderColorPicker()\"\n        (colorSet)=\"setSelectedBorderColor($event)\"\n      ></app-color-picker>\n    </div>\n  </div>\n</form>\n",
                styles: [""]
            },] }
];
GpLibRcaConfigComponent.ctorParameters = () => [
    { type: Commonc8yService },
    { type: AlertService },
    { type: MeasurementService },
    { type: FormBuilder }
];
GpLibRcaConfigComponent.propDecorators = {
    config: [{ type: Input }]
};

/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
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
class ColorPickerComponent {
    constructor(eRef) {
        this.eRef = eRef;
        this.colorSet = new EventEmitter(true);
        this.closeColorPicker = new EventEmitter();
    }
    applyColorClicked() {
        if (this.color !== undefined) {
            if (this.colorType === 'hexa') {
                this.colorSet.emit(this.RGBAToHexA(this.color));
            }
            else {
                this.colorSet.emit(this.color);
            }
        }
    }
    RGBAToHexA(rgba) {
        const sep = rgba.indexOf(',') > -1 ? ',' : ' ';
        rgba = rgba.substr(5).split(')')[0].split(sep);
        // Strip the slash if using space-separated syntax
        if (rgba.indexOf('/') > -1) {
            rgba.splice(3, 1);
        }
        let r = (+rgba[0]).toString(16);
        let g = (+rgba[1]).toString(16);
        let b = (+rgba[2]).toString(16);
        let a = Math.round(+rgba[3] * 255).toString(16);
        if (r.length === 1) {
            r = '0' + r;
        }
        if (g.length === 1) {
            g = '0' + g;
        }
        if (b.length === 1) {
            b = '0' + b;
        }
        if (a.length === 1) {
            a = '0' + a;
        }
        return '#' + r + g + b + a;
    }
    onClick(event) {
        if (this.eRef.nativeElement.contains(event.target) ||
            (event.target.attributes.id &&
                (event.target.attributes.id.nodeValue === 'colorInput' ||
                    event.target.attributes.id.nodeValue === 'colorInputBorder'))) {
        }
        else {
            this.closeColorPicker.emit(false);
        }
    }
}
ColorPickerComponent.decorators = [
    { type: Component, args: [{
                // tslint:disable-next-line: component-selector
                selector: 'app-color-picker',
                template: "<!-- <mat-radio-group aria-label=\"Select an option\" (change) =\"colorType = $event.value\" >\n  <mat-radio-button  checked=\"true\" value=\"rgba\">RGBA</mat-radio-button>\n  <mat-radio-button value=\"hexa\">HEXA</mat-radio-button>\n</mat-radio-group> -->\n<div class=\"form-group\">\n  <label class=\"c8y-radio radio-inline\">\n    <input\n      type=\"radio\"\n      checked=\"checked\"\n      value=\"rgba\"\n      name=\"color-radio-group\"\n      (change)=\"colorType = $event.value\"\n    />\n    <span></span>\n    <span> RGBA </span>\n  </label>\n  <label class=\"c8y-radio radio-inline\">\n    <input type=\"radio\" value=\"hexa\" name=\"color-radio-group\" (change)=\"colorType = $event.value\" />\n    <span></span>\n    <span> HEXA</span>\n  </label>\n</div>\n<div class=\"color-wrapper\">\n  <app-color-palette [hue]=\"hue\" (color)=\"color = $event\"></app-color-palette>\n  <app-color-slider (color)=\"hue=$event\" style=\"margin-left: 16px\"></app-color-slider>\n  <div class=\"colorPickerFooter\">\n    <button class=\"btn btn-default\" style=\"margin-bottom: 5px\">Cancel</button>\n    <br />\n    <button class=\"btn btn-primary\" (click)=\"applyColorClicked()\">Apply</button>\n  </div>\n</div>\n<!-- <div class=\"input-wrapper\">\n    <span class=\"text\">{{color}}</span>\n    <div\n      class=\"color-div\"\n      [ngStyle]=\"{'background-color': color || 'white'}\"\n    ></div>\n  </div> -->\n",
                styles: [":host{display:block;width:316px;padding:16px}.color-wrapper{display:flex;height:150px}.input-wrapper{margin-top:16px;display:flex;border-radius:1px;border:1px solid #dcdcdc;padding:8px;height:32px;justify-content:center}.color-div{width:32px;height:32px;border-radius:50%;border:1px solid #dcdcdc}.text{flex:1;font-family:Helvetica;line-height:32px}.colorPickerFooter{padding:14px;text-align:center;box-shadow:inset 0 1px 0 rgba(0,0,0,.05)}"]
            },] }
];
ColorPickerComponent.ctorParameters = () => [
    { type: ElementRef }
];
ColorPickerComponent.propDecorators = {
    colorSet: [{ type: Output }],
    closeColorPicker: [{ type: Output }],
    onClick: [{ type: HostListener, args: ['document:click', ['$event'],] }]
};

/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
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
class ColorSliderComponent {
    constructor() {
        this.color = new EventEmitter(true);
        this.mousedown = false;
    }
    // tslint:disable-next-line: use-lifecycle-interface
    ngAfterViewInit() {
        this.draw();
    }
    onMouseDown(evt) {
        this.mousedown = true;
        this.selectedHeight = evt.offsetY;
        this.draw();
        this.emitColor(evt.offsetX, evt.offsetY);
    }
    onMouseMove(evt) {
        if (this.mousedown) {
            this.selectedHeight = evt.offsetY;
            this.draw();
            this.emitColor(evt.offsetX, evt.offsetY);
        }
    }
    onMouseUp(evt) {
        this.mousedown = false;
    }
    emitColor(x, y) {
        const rgbaColor = this.getColorAtPosition(x, y);
        this.color.emit(rgbaColor);
    }
    getColorAtPosition(x, y) {
        const imageData = this.ctx.getImageData(x, y, 1, 1).data;
        return 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    }
    draw() {
        if (!this.ctx) {
            this.ctx = this.canvas.nativeElement.getContext('2d');
        }
        const width = this.canvas.nativeElement.width;
        const height = this.canvas.nativeElement.height;
        this.ctx.clearRect(0, 0, width, height);
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
        gradient.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
        gradient.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
        gradient.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
        gradient.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
        gradient.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 1)');
        this.ctx.beginPath();
        this.ctx.rect(0, 0, width, height);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.closePath();
        if (this.selectedHeight) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 5;
            this.ctx.rect(0, this.selectedHeight - 5, width, 10);
            this.ctx.stroke();
            this.ctx.closePath();
        }
    }
}
ColorSliderComponent.decorators = [
    { type: Component, args: [{
                // tslint:disable-next-line: component-selector
                selector: 'app-color-slider',
                template: "<canvas\n  #canvas\n  class=\"color-slider\"\n  width=\"25\"\n  height=\"150\"\n  (mousedown)=\"onMouseDown($event)\"\n  (mousemove)=\"onMouseMove($event)\"\n>\n</canvas>\n"
            },] }
];
ColorSliderComponent.propDecorators = {
    color: [{ type: Output }],
    canvas: [{ type: ViewChild, args: ['canvas', { static: true },] }],
    onMouseUp: [{ type: HostListener, args: ['window:mouseup', ['$event'],] }]
};

/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
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
class ColorPaletteComponent {
    constructor() {
        this.color = new EventEmitter(true);
        this.mousedown = false;
    }
    ngAfterViewInit() {
        this.draw();
    }
    draw() {
        if (!this.ctx) {
            this.ctx = this.canvas.nativeElement.getContext('2d');
        }
        const width = this.canvas.nativeElement.width;
        const height = this.canvas.nativeElement.height;
        this.ctx.fillStyle = this.hue || 'rgba(255,255,255,1)';
        this.ctx.fillRect(0, 0, width, height);
        const whiteGrad = this.ctx.createLinearGradient(0, 0, width, 0);
        whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctx.fillStyle = whiteGrad;
        this.ctx.fillRect(0, 0, width, height);
        const blackGrad = this.ctx.createLinearGradient(0, 0, 0, height);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
        this.ctx.fillStyle = blackGrad;
        this.ctx.fillRect(0, 0, width, height);
        if (this.selectedPosition) {
            this.ctx.strokeStyle = 'white';
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(this.selectedPosition.x, this.selectedPosition.y, 10, 0, 2 * Math.PI);
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
        }
    }
    ngOnChanges(changes) {
        // tslint:disable-next-line: no-string-literal
        if (changes['hue']) {
            this.draw();
            const pos = this.selectedPosition;
            if (pos) {
                this.color.emit(this.getColorAtPosition(pos.x, pos.y));
            }
        }
    }
    onMouseUp(evt) {
        this.mousedown = false;
    }
    onMouseDown(evt) {
        this.mousedown = true;
        this.selectedPosition = { x: evt.offsetX, y: evt.offsetY };
        this.draw();
        this.color.emit(this.getColorAtPosition(evt.offsetX, evt.offsetY));
    }
    onMouseMove(evt) {
        if (this.mousedown) {
            this.selectedPosition = { x: evt.offsetX, y: evt.offsetY };
            this.draw();
            this.emitColor(evt.offsetX, evt.offsetY);
        }
    }
    emitColor(x, y) {
        const rgbaColor = this.getColorAtPosition(x, y);
        this.color.emit(rgbaColor);
    }
    getColorAtPosition(x, y) {
        const imageData = this.ctx.getImageData(x, y, 1, 1).data;
        return 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    }
}
ColorPaletteComponent.decorators = [
    { type: Component, args: [{
                // tslint:disable-next-line: component-selector
                selector: 'app-color-palette',
                template: "<canvas\n  #canvas\n  class=\"color-palette\"\n  width=\"150\"\n  height=\"150\"\n  (mousedown)=\"onMouseDown($event)\"\n  (mousemove)=\"onMouseMove($event)\"\n>\n</canvas>\n",
                styles: [".color-palette:hover{cursor:pointer}:host{width:150px;height:150px;display:block}"]
            },] }
];
ColorPaletteComponent.propDecorators = {
    hue: [{ type: Input }],
    color: [{ type: Output }],
    canvas: [{ type: ViewChild, args: ['canvas', { static: true },] }],
    onMouseUp: [{ type: HostListener, args: ['window:mouseup', ['$event'],] }]
};

/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
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
// tslint:disable-next-line: no-unused-expression
// tslint:disable-next-line: max-line-length
const previewImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABoUAAAJFCAYAAAAbGP7iAAAACXBIWXMAABJ0AAASdAHeZh94AACAAElEQVR42uz9eZxd533feX6e55xz99oXAAUQIAAuEsBNICVRImVZEiXHMRV34sjJOLb86qRlZZmI6u6JaXWmR1LPK21TnZkWmUn3UJx2ZiTHScS8kjii4tiGt4iUZImERIoAV+xAFZba665neZ75495bQIEAia1QKNT3LRdg3nuW5zznFl6o88Xv9xiz5UMeERERERERERERERERuaHZlR6AiIiIiIiIiIiIiIiILD+FQiIiIiIiIiIiIiIiImuAQiEREREREREREREREZE1QKGQiIiIiIiIiIiIiIjIGqBQSEREREREREREREREZA1QKCQiIiIiIiIiIiIiIrIGKBQSERERERERERERERFZAxQKiYiIiIiIiIiIiIiIrAEKhURERERERERERERERNYAhUIiIiIiIiIiIiIiIiJrgEIhERERERERERERERGRNUChkIiIiIiIiIiIiIiIyBqgUEhERERERERERERERGQNUCgkIiIiIiIiIiIiIiKyBigUEhERERERERERERERWQMUComIiIiIiIiIiIiIiKwBCoVERERERERERERERETWAIVCIiIiIiIiIiIiIiIia4BCIRERERERERERERERkTVAoZCIiIiIiIiIiIiIiMgaoFBIRERERERERERERERkDVAoJCIiIiIiIiIiIiIisgYoFBIREREREREREREREVkDwpUegIiIiIiIiIiIyGr31GOP8nf+xs+d971WnDB+cpJ//a0/5rf++e+wUKtf1DF7yiV+4x/8Mn/zkx/jpg2jhGGA956ZuQX++LkX+F//P9/k+z/ae8lj/fNv/r+4f9cO/p9P/Ru+8NiTKz11IiJyDSkUEhERERERERERuQriJOH/+Dff5vt7zgQ1URjygXvv4BM/9V4e/bu/xMceuJe//X/5Tfa9cehtj7Xj1pv57X/6Be6783ZeO3CUJ3/3P/KDH+9j0/oRPvHh9/HJhx7gw/ffw//w2Nf47W9++6LH+Kmf+wg7b7uZKAz5+Ifeq1BIRGSNUSgkIiIiIiIiIiJylUxOz/GNf/cHS1777W9+m55yid/+p1/gr3z8Af7R3/0l/uv//n++4DF6yiW++sXPcfe7b+G3v/mf+LXf+MqS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m5Okk4eIx98gmTlFVl/ApY5Vkp6JiIiIiIhcNIVCIiIiIleB9921S876q1X3/118rmyW4aG8B+fwzrfP7WlXNljTbnf2Nqfyvr0vznXGajrt6Nr7n9nXA759jrPPcz7dc3fW3Tl3rN65tzmGWbqIz+L1mMXjdo/pvYcsO7ONtRC0EyZzzjnxZ5/3nLGGZ60V050L14nrgs4xu0Pybulx3naePeDwmYesc7zutueZl8X5zdyZa7bnnP/seVy8d293L8xZc7eKwqCzpyXIY/s2YXJl/PxxfP1UO+QxJWAY0ztGuH4z4cAgUblMUOyEPVGI6QSz5qzPk8eDS/FZgo+b+FYN15wlq50iOXWY+ORhXLOJR9VBIiIiIiJyY1IoJCIiInKVtJcuebu/WpnlWau++7B78dQXHz55788Z84X29e3N/Dv91bHbmuz819oOz94myOjGH+ac64F24GPOOZY/K3nrhC1vPe2Fxt4NTbqhjz8T7nXO1z1h9/0z13Ax89w5nl96vvNvfu4YuwGZuUCtyiXejwse5zpnLAR5jA0gbeFd3HnDAlH7vXwZUxjClsYI+jcQDo0SVMqEhYggNBjbngLvPT7LcEmTrDVHNneCbPIo2cJpsnq1U2HUbAd/q3O2RERERERE3pFCIRERERERuX551/793HWbOKviLOiF3Ai2d5Sgb5CgXCLIhdjQYLtFP97jnMMnTVxcJVuYJJsdx9XmcHGC9x5jVSEkIiIiIiI3tnClByAiIiIiInJB5kJBzZlKL3wDknHczCn8Qkhm7QWrsrx3nZaLCaQJ3mWdbVUdJCIiIiIiNz6FQiIiIiIissql4BLIPD72nQKiCy621Pk/u6RFoIiIiIiIyFqgUEhERERERFa5Tmu5szrMKeoRERERERF5KzXNFhERERERERERERERWQMUComIiIiIiIiIiIiIiKwBCoVERERERERERERERETWAIVCIiIiIiIiIiIiIiIia4BCIRERERERERERERERkTVAoZCIiIiIiIiIiIiIiMgaoFBIRERERERERERERERkDVAoJCIiIiIiIiIiIiIisgaEKz0AERERERGRtcQd+i8rPQQREREREVmjVCkkIiIiIiIiIiIiIiKyBigUEhERERERERERERERWQMUComIiIiIiIiIiIiIiKwBCoVERERERERERERERETWAIVCIiIiIiIiIiIiIiIia4BCIRERERERERERERERkTVAoZCIiIiIiIiIiIiIiMgaoFBIRERERERERERERERkDVAoJCIiIiIiIiIiIiIisgYoFBIREREREREREREREVkDFAqJiIiIiIiIiIiIiIisAQqFRERERERERERERERE1oBwpQcgIiIiIiIiIiLXhx/8eHKlh7BsxtaX2LS+tNLDEBERWVEKhUREREREREREBID/8X95kWMn6is9jGXxB//yYys9BBERkRWnUEhEREREREREROQcBw8e5PHHH6fRaPDZz36WXbt2XZXjPvXUU8zMzPC5z32OQqFwTa/jfAYHB3n00Ufp7++/6ufes2cPL7zwAp/5zGeu2jGfeeYZvvWtby157WreHxGRG51CIRERERERERERkXPs3bsXgIGBAXbv3s2OHTuuSYizXD75yU/y8MMPL3ltdnaWxx57jK997WtXPaRqNpvs3r2bgYGBq3K87lgBHnvsscUQa8+ePTz55JPcd999VzV8EhG5UdmVHoCIiIiIiIiIiMj1pNlssm/fPnbu3MmDDz7I+Pg4ExMTKz2sq66/v59PfepT7N+/n3379q30cC6o2Wzyta99jYGBAb74xS8uqWratWsXn/3sZ3n++efZs2fPSg9VROS6p0ohERERERERERGRs+zbt4/9+/fz2c9+lm3btvHcc8+xd+9etm7durjNM888w3PPPcdDDz3EN7/5zcXXP/vZzzIwMLCkZdv5qnSeeuopXn75ZQCKxSKPPPLIkuN3K2Omp6fPu82ePXt4+umn2blzJ9/5zncWz325bdTGx8cX9202mzzxxBPs379/yXV13++O7YEHHlhyXc888wy7d+/mb//tv82/+lf/anHse/fuXRz7Ox37ne7H+aqZtm3bxhe+8AXy+fySsZzdZu7c+evev7Nb53Wva9u2bYtVR0899RTPP//84nG2b9/+lqqqc8+lqiURuZ4pFBIRERERERERETnLCy+8wODgINu2baO/v38xGHrwwQeXVKlMT0/zwgsv8Pjjj1MoFHjqqad48sknGRwc5Etf+hL9/f2L7c3GxsYWg4/9+/ezffv2xf2eeeYZHn/88cXQorsO0M6dO/nN3/xNgLds0z3/+Pj44nEux/j4OABjY2PAmWCkG2wVCoXFazhfuHU+PT09fPGLX+SJJ55gYGBgMSB5u2O/XTA0Pj5OsVi8YCu6/v7+JfelG/ic3Wbuqaee4mtf+9olrZ/01FNPceDAgcXjdAOtb3zjG0tCo7179/Ibv/EbbN26dfEan3rqKQVDInJdUvs4ERERERERERGRjtnZWQ4cOMADDzywGB7ce++9TE9Pc+DAgSXbFotFPvWpTy0GMvfeey8An/rUpxb33bZtG4ODg4vhC8Dg4CC/9mu/trjfQw89xNjYGLt37wZg9+7di8fu6m7z9NNP02w2l7x+uYHQwYMH2b17N9u3b2fHjh0APPvsswBLxrdr1y7uu+8+nnvuOWZnZy97bp999lkajcaSOese++mnn77gsScmJt42FDr3/j333HNL7l93nhqNxlvu4YU0m01mZmYWg0GAQqHAr//6ry+GPQcPHmTv3r089NBDi0FdtyWf2tmJyPVKlUIiIiIiIiIiIiId3eBi586di691g53du3ezY8eOxUDjYoOKcw0MDCwJcgqFAjt27OC5557jyJEjHDhwYEkYce423VDoUs7/rW99a0mLs65zW51NTEy8ZXzQDrz27t3LzMzMZV1zd52msbExNmzYcMFjX2wVz4X09/cvVlfBW9u/XazufH/rW99a0v7ubHv37gVY8lmBpUHg5bbzExFZLgqFREREREREREREOBNcNBoNfuu3fust7zcaDSYmJt4SDlyq84Uu53r++efPG2YMDg5e1jnPbv3WbXEGLKlG6lbHLKf9+/fzyCOPvOX1YrF4wX02bNhwSaHR2Wv8FItFfuM3fgOAxx9//JLG+vDDD7Nz504ef/zxxc/DuWsTXeizIiJyvVIoJCIiIiIiIiIiAuzbt4/9+/efd32b7jo/e/fuveJQaGZmhmaz+bbB0MWu33M5+vv7efTRR3nsscd47LHHFtfZKRQKDAwMLGswdG5l0sXYuXMnu3fvZmZm5rxz313rB+Dnf/7n2b1791vm7+DBg5c13q1bt/LVr34VOBOmddd2gnZIdynrFImIrDStKSQiIiIiIiIiIgK88MILDA4Osm3btre8t2HDBsbGxq54XR04Ewp1dSuUtm3bxubNm9m2bRv79u1bsg20W6F95Stfecvrl6O79s309DRf+9rXFo+5YcMGxsfHmZiYeMvcvFO7unP3OVu3HduBAwfeMn/PPPMMX/jCFy44r925371793mvvRvm7dixg1qtRqPRYGxsbMk2e/fupdFovON9ebttunPWaDSYmZlh586d512n6ODBg3z+85/XmkIicl1SKCQiIiIiIiIiImve7Ozsedfy6eqGGtPT028JAS7V9PQ0Tz/99OJ/f+Mb32B8fJyHHnoIgIceeojx8XG+8Y1vLG6zZ88enn/+eR566KF3bD13sXbt2sV9993H/v372b17NwAPPvggxWKRp59+ejGA6Z77gQceoL+/n/7+frZt27YkIOtuc/Z8dauOusd58MEHAZaEUAcPHmT37t2Lxz6fQqHAr/3arzEzM8OXv/zlJeHRnj17ePLJJ9m+fTsPPfQQAwMDFItFXnjhhcVtuuc4WzfQefbZZ4F2MPf0008vhkLNZpOvfOUrbwnhzg4Ot27dys6dO/n617++WInUPc7Y2Bg7duy4KvdJRORqUvs4ERERERERERFZ85599lkajcZiMHM+Dz74IM899xy7d+/mtttuu+xzbd++nWazyWc/+1mg3YLsS1/60mIosnXrVr70pS/x2GOPLW7TXRvnSlvXnetXfuVXmJmZ4Vvf+hZjY2Ps2rWLL37xizzxxBOLLdLOd+5f+ZVf4YknnuDRRx9dvKZf/dVf5Zvf/ObiNvfeey9PPvkkjzzyyGJLvnOPDZy3Xd+5+vv7+c3f/E2eeuqpxXOeb/+tW7fyyCOP8Pjjjy+Z389//vM8+eSTvPDCC+zatYutW7fy6U9/mieffHJx/aFf/dVfXTxmoVDgc5/73FvGem67uM985jM888wzS9YVupwWeSIi14oxWz7kV3oQIiIiIiIia4U79F9WeggiIhf0M3/rjzl2or7Sw1gWf/AvP8am9aWVHoaIiMiKUvs4ERERERERERERERGRNUChkIiIiIiIiIiIiIiIyBqgNYVERERERERERASA//s/unulhyAiIiLLSKGQiIiIiIiIiIgA8L57hld6CCIiIrKM1D5ORERERERERERERERkDVAoJCIiIiIiIiIiIiIisgYoFBIREREREREREREREVkDFAqJiIiIiIiIiIiIiIisAQqFRERERERERERERERE1oBwpQcgIiIiIiIiN7Zms8kTTzzB/v37ARgcHOTRRx+lv7//bfc7ePAgjz/+OI1G45L2ExERERGR81OlkIiIiIiIiCybbiA0MDDAk08+yZNPPsm2bdt47LHHmJ2dveB+e/bs4bd+67d46KGHePLJJ3n88ccZGBh4x/1EREREROTCFAqJiIiIiIjIstm9ezfj4+M89NBDi6996lOfAuDZZ5897z7NZpPdu3dz33338fDDDwNQKBT41Kc+RaPR4MCBAyt9WSIiIiIiq5JCIREREREREVk2ExMTjI2NsWHDhsXX+vv72bZtG/v27aPZbJ53n+np6SVBEsDWrVv56le/yq5du1b6skREREREViWtKSQiIiIiIiLLotlsMjMzw8DAAIVC4S3vz8zM0Gw23/LezMwMxhgKhQJf+cpXFtci2r59O5/73OfOeywREREREXlnqhQSERERERGRa+7syqFzjY+PMz09zZe+9KUlawoBfPnLX9aaQiIiIiIil0mVQiIiIiIiInJd+uQnP7nYKq67ptDjjz/Os88+ywc+8AFardYlHzMMQ9I0XelLExERERF5i7GxsWU/h0IhERERERERueYmJibecZtzfyjesGEDY2NjTExMkMvlyOVyl3TOP/zDP+Tmm2/mtttuW+nLlyswMTFBT08PlUplpYciV0D38cag+3hj0H1c/XQPbwwTExMsLCzQ09OzrOdRKCQiIiIiIiLLolAoMDAwcMG1gy601tDF/AvJy/1huVQqLfsP2rK8FhYWqFQquo+rnO7jjUH38cag+7j66R7eGBYWFq7JebSmkIiIiIiIiCybDRs2LIZCXbOzsxw4cIAdO3acNxTatm0bg4ODvPDCC0ten5iYYHx8nHvvvXelL0tEREREZFVSKCQiIiIiIiLL5sEHHwTga1/72mIw9PTTTy9571z9/f088MADPP/88+zZsweAZrPJ008/zdjYGDt27FjpyxIRERERWZXUPk5ERERERESWTX9/P1/84hd54okneOSRRwAYHBzk0Ucfpb+/H4CDBw/y+OOP89BDD/Hwww8D8PDDDzM2NsaTTz65eKzt27fzuc997rzVRSIiIiIi8s4UComIiIiIiMiyKhQK/Pqv//oF39+6dStf/epX3/L6rl27loRCIiIiIiJyZdQ+TkREREREREREREREZA1QKCQiIiIiIiIiIiIiIrIGKBQSERERERERERERERFZAxQKiYiIiIiIiIiIiIiIrAHhSg9ARGQt8PiVHoJcAYNZ6SGIiIiIiIiIiIhcMYVCIiLLzACmU5ipaGH18SjUExERERERERGRG4NCIRGRZWSxRD4k8iEBARYLChhWiXaEF5PQsE0yMlUMiYiIiIiIiIjIqqZQSERkmXjAekPeR1RcmV5fIfKRqk5WDQN45m2VE2aSzGQrPSAREREREREREZErolBIROQa6PUVbk220ucrZLiVHo5cBIPB4zkaTjBj52iZBhCs9LBEREREREREREQum0IhEZFl5Dv/K/kiN2XrGXFDZKjiZDUwGJxxtGxMRIja/omIiIiIiIiIyGqnUEhEZJl5wHgICAh9gDGKF1YDg8F6Q+AtYLrd5ERERERERERERFYthUIiIteABxwOZ5zax60S3Uohh2c50iDf/aWTN13uvhd3LSIiIiIiIiIiIgqFRERErinfTXS6OZMHbwBj3jG8Od++F3XOizy+iIiIiIiIiIjc2BQKiYiIXCPWGqLAUogCclG7lWCWeRpxSpxkZN53gp8L75uPAvJRgL2IhMcDznlaSUa9lZI59b8TEREREREREVnLFAqJiIgss26nt3xo6S/n2ThUZt1AkcBaqs2Eo6ernJip02ilpOekQmfv21fOMzZYYv1AiVxo2wHSecKh7kuZ87TSjInpOodOVqk2E7xXMCQiIiIiIiIislYpFBIREVlunfAmHwUMVPKM9BdZ318iCi0LjZRWktGMM9LMk7TSpesMdfYNrKWYCxjqKbBhsETmPLVGQpy6C1YAhaGlLxfgHCSpZ3K+wUIjIU4zlA2JiIiIiIiIiKw9CoVERESWncdgKOZC+so5osDSTDOcB2Ogr5xjuK9AtZlQb6VnyoOWHKHdWs4DadYOeI6cqjJTa9FoZfjOObrbAgxU8mwartBXznHbxj56ihGHTi4wV49J0gwHWmdIRERERERERGQNUSgkIiKyzAwGG1gK+ZBKMQI887WYKLQE1lKIQvpKOQq5AGvNO7Z4c97TjDNmazGT800azRR8J2ECumVArSTDWktgDSO9RUb7C8RphrEwvdDCZ26lp0ZERERERERERK4hhUIiIiLLzFpDPrSU8yGlfEictAOdMLCUCiGVQkSpEFLMhUShJUndOwZDxoC1EBiDsQbvzZlMqFP/04wzxqdqWCAXWiqFiM2jFZz31Jopznmc+siJiIiIiIiIiKwZCoVERESWSbcLXC609JZy9JQi8lFArZkwW23hgUocUYgCClFAMRdSiAKyzJH6d27tZpYsPnT2621p5qm3UmaqLXrn2+fpLeboLeUo5UOS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A5ILMou/d0I8BUIiIiIiIiIiInKDUCgkIrKs2qFCbGKm7SwecGQKhVYBg8Ebz5ytkpGBVzgkIiIiciOYnG6t9BBuGMOD+ZUegoiIiFwihUIiIsvI0A4X5m2N18KDFMjjFQmtKlN2htjEqIWciIiIyI3hBz+e5B/9kz0rPYxV76//5c18+b+/e6WHISIiIpdIoZCIyDIxgDee1KfM2ypN08JiV3pYcomapkViUhQKiYiIiIiIiIjIaqdQSERkGTk8TRsT+wRjrGKFVcjhyHBaW0hERERERERERFY9hUIiIsvI43F4MqOWcauZAiEREREREREREbkRKBQSEVlm5qxfRURERERERERERFaKFrcQERERERERERERERFZAxQKiYiIiIiIiIiIiIiIrAFqH3cW7z10l/0wBqNuTyIiIiIiIiIiIiIicoNQKNRhgCCwBNbgPWTe473Ha214ERERERERERERERG5ASgU6rDWMtybZ7S/SCvJmF5oUW0ktJIMh5aIFxERERERERERERGR1U2hEBAFlnIhYsNgma3repivx6SZJ04yWmmGUiEREREREREREREREVnt1mwo5Du/GAPlQsRNI2XGBktUChGNOMUarlkQ5PGcWczo7H51ZvF3o1RKRERERERERERERESuwJoNhQJjiCJLMReyfqDEpqEKQ70FosCCb0cz12I9IYsh8CHt/wUYbzG0z++MIyMjJSU1WSc8utbODam6oztfeLVSYzsTmflzXl/ZcXXHZs66d9fL2Mzi6Px1cz9FREREREREREREZDmtuVDIe7DWkAstw70FNo/2MNpXpLcUUcgFZO7aRC8ej8US+og+V2HYDdLrKxR8AYslI6NFi3lb5bSdYtbOk5oUD9euasi7dmDgPcYYLCFgcDi8z8B0xmIs1zpI8N6Bd+3IxQZn5sRnOJ+1Z8nYdinYNR2bXxwbgDUhxliM93hc56sztmsevrTHZvCYdhzZnh/vcD5tb2LsCo1NRERERERERERERJbbmgqFDGADQzEXMljJs2GwxLr+IsV8SDPOcN63K4WWmcUQ+YiyL9Hv+hh2A4y4ISq+l7wpYrE4MmLfZMHNUw6KnPJTzNsF6qZJalLcskZX7WNbmyOwOazJtf9/EwEG51OcT8hcC+dinE/w12ThpW4kZhfHFdgcQZDHmAC8x/kM52IyF+P82WNjmcfn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fTuhNe2RcND8Mww2JJQhZyWMKEOB7b9ORERERERERERERM43BYVEBIj5QIFAYxqmpqIyNR3uroBPwAB5yFnzKwzDAKNlREREREREREREROSRoN1cEblLoDUdM1MxtTM63JFHopyMlTBmGAbYYI48IiIiIiIiIiIiIiLnlYJCInKnAB7PzNQcmBmd6e4qIxfIQsaKHzEIA8zrisyJiIiIiIiIiIiIyHmkoJCIvI4nHAaFcMRuQjH4E4A8ZKz4MUNf9h9XppCIiIiIiIiIiIjIeaegkIjcxRAIzEzFxE7pTLd4ZN5fKCdjNYwYhlKZQiIiIiIiIiIiIiKPCAWFROR1PJ6pmTExB7R0r3s8C2lfPq7EYsAoU0hERERERERERETkvFNQSETuYvrycRUTM32DnkKQkFCEnEEoKUNBEtKzHrSIiIiIiIiIiIiIvAUFhUTkdYLxTPvycTFT6PUl4iyWMuSs+DFFKDB92TkREREREREREREROZ8UFBKRO5g+U6g2FQdmSmvaNwz2GAxFKFgNY0r1FhIRERERERERERE59xQUEpHXCQQa0zA1M2paHO6uwFD8vyJkfW+hog8JKVNIRERERERERERE5LxSUEhE3lAwns50zGzFzFQ4/OFjxIJyGRmjMKAIOShTSERERERERERERORcU1BIRN5YiGXkDsyMiZ3hjHtdibgspAzDgDxkCgmJiIiIiIiIiIiInHMKConIPXnjqW3zukyhuTSkDHxJRgZBYSERERERERERERGR80xBIRG5h5gpVJmayjR44173GRkpg1AeyRRSTyERERERERERERGR80pBIRG5p4CnpqHuM4VMX0Au9MGfNBwGhdRTSEREREREREREROR8U1BIRO7JE6hNTUWNX5SPOwz+pCSUoSAjwyooJCIiIiIiIiIiInKuKSgkIvdg8Hgq0zCz9Rv2FLJYMlLykJGRYrSkiIiIiIiIiIiIiJxb2sEVkXsK80whU+OMe10ukMGQBEseYmAoITnrIYuIiIiIiIiIiIjIPSgoJCL35E2gMg2VmZePe+MScRkZg1CShvSOnkMiIiIiIiIiIiIicn4oKCQib8j05eMaYlDojcrHQQAMWcgYhgE5Gai3kIiIiIiIiIiIiMi5pKCQiNxTIND2mULOOLgrAyiGhCALKQMfM4VERERERERERERE5HxSUEhE7ikQ8Hg6OhrT0pruDUvDZWSUoSBTUEhERERERERERETk3FJQSETekicwo2ZGLCNn7ioRl4WUQSjImAeF1FNIRERERERERERE5LxRUEhE3pLDU5mayjSEO3oLxQJyKQlFKEhDqo5CIiIiIiIiIiIiIueUaj2JyFsweBODQrWp8Wa4SASa9xRKQ0oRclKS/iMiIiIiIiIiIvIk+OH/z6+f9RAeC3/sD7+DKxfLsx6GPAEUFBKRN2Gg7ysUM4VqPL7/6KGUhIKcNCRnPWAREREREREReUT8rb//hbMewmPhD/zep/ngBy6d2c//Dz9/la+8Mjnrw/DI+2N/+B1nPQR5QigoJCL3NA/+ODz1PFMIf+SRKA0JRchIUFBIRERERERERI5nZ7fhM7907ayH8cj7A7/36bMegog8QtRTSETewmH5uMo0+DtyhKKUvnxcUJxZRERERERERERE5LzSDq6IvKV5+biaGm88ZtFTKGAwMVOI2FPI9I+IiIiIiIiInJTXbldnPYTHxuUL6mEiIvIkUVBIRN5SDAo11LY5Uj7uUMwUKkhJFQ4SERERERGRE/f/+8mX+cf/3//nrIfxyPvB73sP3/P/euGshyEiIqdI5eNE5C25tygfl5CQhZQ0JCTBcnfQSERERERERERERETOnoJCIvKmDGZRPq4yNYHD8nF3f14WUnJyrJYWERERERERERERkXNHO7ci8pY8nsa01DR0xhNeFxUKGOZl5HISkrMesoiIiIiIiIiIiIjcRUEhEXlLgYCjozUdrWnpcHc9DmDI5kGhkCy+TkRERERERERERETOBwWFRORYAoHOdNSmoTUdvs8OmjNAGlIKlCkkIiIiIiIiIiIich4pKCQix+ZwzKioib2FWISFAoeZQpmCQiIiIiIiIiIiIiLnkIJCInJsDk9lairTvGFpuDTE8nFp0NIiIiIiIiIiIiIict5o51ZEjs3hmJmG2rR4E+7MEwqQ9UEhZQqJiIiIiIiIiIiInD8KConIMRmc8dSmpllkCt3ZVSglpQgFSVBQSEREREREREREROS8Sc96ACLy6PDcHRQ6ZDjMFEqVKSQiIiIij6H/58U9fvynvnrWw3gs/L8/9t6zHoKIiIjIE0lBIRE5No+nMS0tHYFwJE8oZg0tysctMoXuziYSEREREXm0/cufeOmsh/DI+x3v3jjrIYiIiIg8sVQ+TkSOzeNpaelMd0ee0Dz0E8vHqaeQiIiIiIiIiIiIyHmkoJCIHEPM9vEm3JEpdHdPoUX5OPUUEhERERERERERETl3FBQSkbc0D/3ETKGObhEUuvNzMmUKiYiIiIiIiIiIiJxbCgqJyLEtegoZB0eCQvMAUcwUKhQUEhERERERERERETmHFBQSkWMxGDyB1nSxp5C5u3icIQ0pRchIQ4K541EREREREREREREROWsKConIsXnjaTnaU+hOBkNCQkaiwJCIiIiIiIiIiIjIOaOgkIgcW+jLx3VmHhS6M+hjjMH2GUM5GUZLjIiIiIiIiIiIiMi5oR1bETm2QKAzHS0dnsDrk4UCBkNORh5y9RYSEREREREREREROUfSsx6AiDw6AgGHxxmHw+GNv+vxWEIuCxllyJmGGZ0qyImIiIiIiIiIiJxbXedpWv/w30gYDs5/yOX8j1BEzh03LyNHh+n/OWTIQkoRchJsn0wU1F9IRERERERERETknPrGj/zsWQ/hkbcyzvjsT/zBsx7GW1L5OBG5bx5PS0uHAzgS8AkYICeLQaGQ8AY15kRERERERERERETkDCgoJCL3zRtPYzo60xHuCvqYI5lCVkuMiIiIiIiIiIiIyLmhHVsRuQ8xI8jjaU1LZ9wdIaGjPYXykJOQnPWARURERERERERERKSnoJCI3DeHpyH2FOJ1mUKQ0fcUClpiRERERERERERERM4L7diKyH2L5eNa2j5TyNzxaMwUKshJtMSIiIiIiIiIiIiInBvasRWR++bwtLalMx2Yw7BQIGCCIWfeU0jl40RERERERERERETOCwWFROS++SPl48JdjxmIPYXIlCkkIiIiIiIiIiIico5ox1ZE7pt/055ChjSop5CIiIiIiIiIiIjIeaMdWxG5TwZnHI2JYaHwBo+nJGQhxS6WmHB/P0JERERERERERERElk5BIRG5L4bYU6g2Da3pYh+h/rH5f2chJQ/ZkaCQiIiIiIiIiIiIiJw17diKyH1zxvVBobb/iFk8ZjCkpGQhwwaLsoREREREREREREREzgcFhUTkPsTgz92ZQndLgiUjJcFiMBwNGomIiIiIiIiIiIjI2VBQSESObR7acfSZQtxZPu7oZxoMWUjJQtoHhkRERERERERERETkLCkoJCL3zZnDTKE3ZMKdZeQUFBIRERERERERERE5cwoKich98zhq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ERERERERETlD2qEVkYcSiD2FGtPQ4V73uMVShIwi5Ng+syjc908RERERERERERERkYeloJCIPLQOR0XdZwrd1VMoWMpQUPoCG+ZLjsJCIiIiIiIiIiIiIqdNQSEReWit6ajeIFMo9D2FipBThpyEBEC9hURERERERERERETOgIJCIvLADIZAoDEtUzOjNe3ikTmLIScjJyMlwWjZERERERERERERETkT2p0VkYfmcNSmoTEdDn9X1yCDxZKGlDxkpCFVppCIiIiIiIiIiIjIGVBQSESWwNMZR0tLa1o8/q7HAwkJA19ShALbZxiJiIiIiIiIiIiIyOlRUEhElsLjaUx7j95CkGApQ0EZckzQ0iMiIiIiIiIiIiJy2rQzKyJLE3sLVXSmA7ijTFxCwoCSgpgpJCIiIiIiIiIiIiKnS0EhEVmKQAwKzWxFZ9zrHrfBUoSCIuR9sEjl40REREREREREREROk4JCIrIEMcjTmJaZqWjp7no8LMrHFSHHaukREREREREREREROXXamRWRpQgm0NBSmXpRPq5/JPYUCgmDOzKFRERERERERERERPDW5/EAAIAASURBVOQ0KSgkIksRgJaWGRUdsXzc0SJx80yhMsx7Cql8nIiIiIiIiIiIiMhpUlBIRJZgXj6uiT2FFuXjDjOCEhJGYcAgFNigpUdERERERERERETktGlnVkSWIgD1vKeQ6e56LJCEhKEvGYRSPYVEREREREREREREzoB2ZkVkKQKBytTsmwNa0wLc0TloXj5uEErykCkwJCIiIiIiIiIiInLKtCsrIg/N9OGfxjRM7YzGtHjCHV2DLIaMbNFXKA3Z4utERERERERERERE5OQpKCQiSxEIOBw1DRU1talxuDs+x2DIQspKGPZl5MxdoSMREREREREREREROSkKConIEgU645iaiqmp6Iw78kgMHGWkjP2YYSgxQUuQiIiIiIiIiIiIyGnRjqyILJXHM7MV+/aAlg4Dd5SJy0LGShgxCAMsBpQpJCIiIiIiIiIiInIqFBQSkSWK5eCmZhaDQqaFu/oGxUyhEcMwUE8hERERERERERERkVOkoJCILFUMClVMTMwUuvvReabQ0JdYLMoUEhERERERERERETkd6VkPQEQeJwZvArN5UMi0i0dCH/zJQsqqHzEKgz4oJCIiIiIiIiIiIiKnQTuyIrJUAc/MVOzbKa2JmUJHi8RlpIxDLB+XkoBRCTkRERERERERERGR06CgkIgskcETqPpMoYaWsMgRihIsecgoQ8HAl6QhU28hERERERERERERkVOgoJCILI0hlolrTM2BnVKbBoe7Iyw0/688ZIzDiDIUi68TERERERERERERkZOjoJCILJ03npaOqa2Y2RqHf93n5GSs+CGDUChTSEREREREREREROQUKCgkIssXDN54pmbKvj2gM92RwE/MCDqaKTTPMRIRERERERERERGRk6OgkIicAIPHc2BmTMwBHa7/6J3l41Z8Xz4uKFNIRERERERERERE5KQpKCQiJ8ITmJoZB2baZwoBR8rEZWSMw5AylCofJyIiIiIiIiIiInIKFBQSkRPh8cxMxYGZ4XBwV/m4IuSs+jGDUNzxcRERERERERERERE5GQoKicgJiOXjZrZiaqd0xi0emYd+spAy9kOGviQlUbaQiIiIiIiIiIiIyAlTUEhEToQ3gemRTKG7gz4JCQU5wzBgFAakpGc9ZBEREREREREREZHHmoJCIrJ0ps8UqkzNgaloTIvH3/E5FkMaUgahZOxH5CHHYAgqIyciIiIiIiIiIiJyIhQUEpETEQh0dIu+QjNT4Y4EhmLox1CEnJUwpFj0FhIRERERERERERGRk6CgkIiciAB4HI1pOLBTpqbCmzvLyBkgJ2PsRxR9ppCIiIiIiIiIiIiInAwFhUTkRMzDOw7P1MyY2tkdmULzXKEi5IxDDAod/biIiIiIiIiIiIiILJeCQiJygkwfFKqYmhkOtwgWzUM/RShY9WPKUChPSEREREREREREROQEKSgkIifKGxczhcwMZzzcEfoxlCFn1Y8ZhKJ/TJlCIiIiIiIiIiIiIidBQSEROUHmsHycmeHxmL5zUCDEnkIhYxyGjMOIURiQkp71oEVEREREREREREQeSwoKiciJcjgOzIyDvnzc3VISBqFkw6+y6dcoQwnEoJGIiIiIiIiIiIiILI+CQiJyggzOeA7MlD0z4cDMaGjwRwI+BkMaEsZhxKZbpwzFWQ9aRERERERERERE5LGkoJCInBgDeDwzW7GbTNi2e0yOlJGDeQchw8gP2PBrDEK5KDAnIiIiIiIiIiIiIsujoJCInKhAwOOpTMWO3WPfTnDG9yGheW8hwygM2fRrDHx51kMWEREREREREREReSwpKCQi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';

const ɵ0 = {
    id: 'rca-chart.widget',
    label: 'RCA Chart',
    previewImage: previewImage,
    description: 'Display the RCA whenever AD > 1',
    component: GpLibRcaComponent,
    configComponent: GpLibRcaConfigComponent,
    data: {
        ng1: {
            options: {
                noDeviceTarget: false,
                noNewWidgets: false,
                deviceTargetNotRequired: false,
                groupsSelectable: true,
            },
        },
    },
};
class GpLibRcaModule {
}
GpLibRcaModule.decorators = [
    { type: NgModule, args: [{
                declarations: [
                    GpLibRcaComponent,
                    GpLibRcaConfigComponent,
                    RCAViewModalComponent,
                    ColorPickerComponent,
                    ColorSliderComponent,
                    ColorPaletteComponent,
                ],
                imports: [
                    CoreModule,
                    CommonModule,
                    ModalModule.forRoot(),
                    FormsModule,
                    NgSelectModule,
                    ReactiveFormsModule,
                    ChartsModule,
                ],
                exports: [
                    GpLibRcaComponent,
                    GpLibRcaConfigComponent,
                    RCAViewModalComponent,
                    ColorPickerComponent,
                ],
                entryComponents: [
                    GpLibRcaComponent,
                    GpLibRcaConfigComponent,
                    RCAViewModalComponent,
                    ColorPickerComponent,
                ],
                providers: [
                    GpLibRcaService,
                    BsModalService,
                    Commonc8yService,
                    {
                        provide: HOOK_COMPONENTS,
                        multi: true,
                        useValue: ɵ0,
                    },
                ],
            },] }
];

/*
 * Public API Surface of gp-lib-rca
 */

/**
 * Generated bundle index. Do not edit.
 */

export { GpLibRcaComponent, GpLibRcaModule, GpLibRcaService, ɵ0, Commonc8yService as ɵa, GpLibRcaConfigComponent as ɵb, RCAViewModalComponent as ɵc, ColorPickerComponent as ɵd, ColorSliderComponent as ɵe, ColorPaletteComponent as ɵf, previewImage as ɵg };
//# sourceMappingURL=custom-widget.js.map
