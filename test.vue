<template lang="pug">
  .subscription-users
    .box(v-if="error")
      article.message.is-danger
        .is-flex.has-flex-direction-row.has-justify-content-space-between.has-aligned-center
          .message-body {{ error }}
          button.button.is-small.is-primary.mr-4(@click="getDataFromMicrosoft" v-tooltip="$t('subscriptionComponent.userAssignmentV2.itsNotYourDayToday', { name: vendorName })")
            span {{$t('common.tryAgain')}}
            span.icon
              i.fa.fa-refresh
    .box(v-else)
      div(v-if="!loadingMicrosoftMeta")
        article.message.is-danger(v-if="licenseError")
          .is-flex.has-flex-direction-row.has-justify-content-space-between.has-aligned-center
            .message-body {{ licenseError }}
        .is-flex.has-flex-direction-row.has-aligned-center.has-justify-content-space-between
          .table-title.is-size-4 {{ $t('subscriptionComponent.userAssignmentV2.availableLicenses') }}: {{ numberOfUnassignedLicenses }}
          .is-flex.has-flex-direction-row.has-aligned-center.parent-space
            b-switch(
              v-model="assignedFlag"
              :left-label="true"
              type="is-info"
              ) {{ assignedFlag ? $t('subscriptionComponent.userAssignmentV2.assignedOnly') : this.$t('subscriptionComponent.userAssignmentV2.unassignedOnly') }}
            button.button.is-small.is-success(
              @click="goToCreateUser"
              id="create-user-button"
              v-if="hasCanCreateUser"
              )
              span {{$t('common.createUser')}}
              span.icon
                i.fa.fa-user
            b-tooltip(:label="$t('subscriptionComponent.userAssignmentV2.downloadReport')" :delay="500")
              b-button(
                size="is-small"
                icon-right="download"
                @click="downloadAssignedUsersReport"
                :loading="loadingCsv"
                :disabled="numberOfAssignedUsers < 1 || usersAreInProgress"
                ) {{ $t('subscriptionComponent.userAssignmentV2.downloadCSV') }}
            button.button.is-small(
              @click="goToPartnerCenterCompany"
              v-tooltip="$t('subscriptionComponent.common.partnerCenterPage')"
              v-if="hasPartnerCenterAccess"
              )
              span {{ $t('subscriptionComponent.common.partnerCenter') }}
              span.icon
                i.fa.fa-external-link
            button.button.is-small.is-primary(@click="getDataFromMicrosoft" v-tooltip="$t('subscriptionComponent.userAssignmentV2.refreshData', { name: vendorName })")
              span {{ $t('common.refresh') }}
              span.icon
                i.fa.fa-refresh
        .updated-at.is-flex.has-flex-direction-row.has-justify-content-end {{ $t('subscriptionComponent.common.lastUpdated', { time: updatedAt }) }}
        data-table(
          :columns="userColumns"
          :actions="actions"
          qa-id-prefix="qa-assigned-users-table"
          :row-fetcher="getUsers"
          :search-params="searchParams"
          :loading="loadingUsers"
          )
          template(slot="injected-actions" slot-scope="{ row }")
            assign-unassign-license-button(
              v-if="hasCanLicense && foundLicense"
              :original-rap-invocation-guid="companyMeta.rapInvocationGuid"
              :vendor-user="row"
              :license-id="license.skuId"
              :key="`${row.vendorId}-${license.skuId}`"
              :company-guid="company.guid"
              :offer-id-key="offerIdKey"
              :has-license="row.hasLicense"
              :number-of-available-licenses="numberOfUnassignedLicenses"
              :is-disabled="isAssignUnassignDisabled"
              @actionStarted="onAssignUnAssignStart"
              @on-assigned-license="assignUnassignLicenses"
              @on-unassigned-license="assignUnassignLicenses"
              @onError="onAssignUnAssignError"
              )
          template(slot="table-cell" slot-scope="{ column, row }")
            template.has-text-centered(v-if="column.field === 'status'")
              span.icon
                i.fa.fa-remove(v-if="row.state.isDelete" v-tooltip="'Pending Delete'")
                i.fa.fa-building-o(v-else-if="row.isLocal" v-tooltip="'Local'")
                i.fa.fa-cloud(v-else v-tooltip="'Cloud'")
            template(v-else-if="column.field === 'name'")
              a(:href="`#/vendor/user-detail/${vendorName}/${company.guid}/${row.vendorId}`") {{ row.name }}
            template(v-else) {{ row[column.field] }}
      .is-flex.has-flex-direction-column(v-if="loadingMicrosoftMeta")
        article.message.is-info(v-if="showMicrosoftLoadingWarning")
          .message-body {{ $t('subscriptionComponent.common.highVolume', { name: vendorName }) }}
        progress.progress.is-small.is-primary(v-if="loadingMicrosoftMeta" max="100")
</template>

<script>
import { values, get, reduce, isEmpty } from 'lodash';

import AuthenticationServiceV2 from '@/services/vendor/microsoft/AuthenticationServiceV2';
import FormatService from '@/services/FormatService';
import VendorManagementService from '@/services/vendor/VendorManagementService';
import VendorService from '@/services/vendor/VendorService';

import AssignUnassignLicenseButton from '@/components/subscription/userAssignment/AssignUnassignLicenseButton.vue';
import ExcelsiorConsent from '@/components/cpv/consent/ExcelsiorConsent.vue';
import ExcelsiorPermissionDenied from '@/components/excelsior/ExcelsiorPermissionDenied.vue';
import PdaService from '@/services/vendor/PdaService';

export default {
  name: 'UserAssignmentV2',
  components: {
    ExcelsiorConsent,
    AssignUnassignLicenseButton,
    ExcelsiorPermissionDenied,
  },
  props: {
    vendorName: {
      type: String,
      default: 'Microsoft',
    },
    company: {
      type: Object,
      required: true,
    },
    partner: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loadingCsv: false,
      searchParams: {
        q: this.$route.query.q,
      },
      assignedFlag: true,
      loadingUsers: false,
      companyMeta: {},
      companyTenantId: null,
      error: null,
      loadingMicrosoftMeta: true,
      assigningUnassigningLicenses: {},
      users: [],
      showMicrosoftLoadingWarning: false,
      selectedRow: null,
      isAssignUnassignDisabled: false,
      userColumns: [
        { field: 'status' },
        { field: 'name', label: this.$t('common.name') },
        { field: 'email', label: this.$t('common.email') },
      ],
      actions: [
        {
          icon: 'fa-user',
          name: this.$t('subscriptionComponent.userAssignmentV2.userDetail'),
          rowActionId: user => `user-detail-${user.vendorId}`,
          onClick: (user) => {
            this.$router.push({
              name: 'vendor-user',
              params: {
                vendorName: this.vendorName,
                companyGuid: this.company.guid,
                vendorUserId: user.vendorId,
              },
            });
          },
        },
        {
          icon: 'fa-windows',
          name: this.$t('subscriptionComponent.userAssignmentV2.userPartnerCenter'),
          rowActionId: user => `msaction-${user.vendorId}`,
          if: () => this.hasPartnerCenterAccess,
          onClick: (user) => {
            this.goToPartnerCenterUser(user);
          },
        },
      ],
    };
  },
  asyncComputed: {
    vendor: {
      get() {
        return VendorService.listV3({ search: this.vendorName })
          .then((r) => {
            if (!r.content || r.content.length === 0) {
              throw new Error(`no ${this.vendorName} vendor found`);
            }
            return r.content[0];
          });
      },
    },
    numberOfAssignedUsers: {
      get() {
        return this.productVendorSku && this.partnerGuid && this.company?.guid ? PdaService.queryRecords(
          this.vendorName.toLowerCase(),
          'users',
          {
            partnerId: this.partnerGuid,
            companyIds: [this.company.guid],
            version: PdaService.getCurrentVersionForData(),
            returnTotalOnly: true,
            search: [
              {
                operator: 'CONTAINS',
                searchBy: [{
                  path: 'data.licenses.*.offerIds',
                  value: this.productVendorSku,
                }],
              },
              {
                operator: 'NOT_EQUALS',
                searchBy: [{
                  path: 'data.deleted',
                  value: 'true',
                }],
              },
            ],
            pageSize: 100,
            page: 0,
          },
        ).then(r => r.totalNumberOfRecords) : Promise.resolve(0);
      },
      default: 0,
    },
    licenses: {
      get() {
        return PdaService.getRecords(
          this.vendorName.toLowerCase(),
          'licenses',
          {
            partnerId: this.partnerGuid,
            companyId: this.company?.guid,
            version: PdaService.getCurrentVersionForData(),
          },
        ).then(r => this.rapService.getAllLicenses({ licenses: r.records?.map(it => ({ ...it.data })) }));
      },
      default: {},
    },
  },
  computed: {
    license() {
      return get(this.licenses, this.productVendorSku) || {};
    },
    licenseError() {
      if (this.loadingMicrosoftMeta || this.$asyncComputed.licenses.updating || this.$asyncComputed.numberOfAssignedUsers.updating) {
        return null;
      }

      if (isEmpty(this.license)) {
        return this.$t('subscriptionComponent.userAssignmentV2.notAbleToAssociate', { company: this.company?.name, name: this.vendorName });
      }

      const vendorTotal = this.license.prepaidUnits?.enabled || 0;
      const vendorAssignedTotal = this.license.consumedUnits || 0;

      if (vendorTotal !== this.quantity) {
        return this.$t('subscriptionComponent.userAssignmentV2.mismatchInPax8System', { name: this.vendorName, quantity: this.quantity, total: vendorTotal });
      }

      if (vendorAssignedTotal !== this.numberOfAssignedUsers) {
        return this.$t('subscriptionComponent.userAssignmentV2.mismatchInSystem', { name: this.vendorName, users: this.numberOfAssignedUsers, total: vendorAssignedTotal });
      }

      return null;
    },
    offerIdKey() {
      return get(this.license, 'offerIdKey', '');
    },
    updatedAt() {
      return this.companyMeta?.updatedAt ?
        FormatService.date(new Date(this.companyMeta.updatedAt), 'dddd, MMMM Do YYYY, h:mm:ss a') :
        this.$t('subscriptionComponent.common.unknownRefresh');
    },
    partnerGuid() {
      return get(this.$store.getters.user, 'userPartnerGuid');
    },
    hasCanLicense() {
      return this.user.hasFeature('F_CAN_LICENSE_USER_EXCELSIOR');
    },
    foundLicense() {
      return !isEmpty(this.license);
    },
    hasPartnerCenterAccess() {
      return this.user.hasFeature('F_CAN_ACCESS_PARTNER_CENTER_EXCELSIOR');
    },
    hasCanCreateUser() {
      return this.user.hasFeature('F_CAN_CREATE_USER_EXCELSIOR');
    },
    hasCanViewUser() {
      return this.user.hasFeature('F_CAN_VIEW_USER_EXCELSIOR');
    },
    user() {
      return this.$store.getters.user;
    },
    rapService() {
      return VendorManagementService.getService(this.vendorName);
    },
    subscription() {
      return this.$store.getters.currentSubscription;
    },
    usersAreInProgress() {
      return values(this.assigningUnassigningLicenses).filter(it => it).length > 0;
    },
    partnerId() {
      return this.subscription.partnerId;
    },
    companyId() {
      return this.subscription.companyId;
    },
    quantity() {
      return this.subscription.quantity;
    },
    product() {
      return this.subscription.product;
    },
    numberOfUnassignedLicenses() {
      return get(
        this.licenses,
        `${this.productVendorSku}.availableQuantity`,
        0,
      );
    },
    productVendorSku() {
      return this.product?.vendorSku?.toLowerCase();
    },
  },
  watch: {
    assignedFlag: {
      handler() {
        this.updateParams(this.searchParams);
      },
    },
  },
  mounted() {
    this.getCompanyMicrosoftMeta();
  },
  methods: {
    updateParams(searchParams) {
      this.searchParams = { ...searchParams };
    },
    goToCreateUser() {
      this.$router.push({
        name: 'vendor-user-create',
        params: {
          vendorName: this.vendorName,
          companyGuid: this.company.guid,
        },
        query: {
          subscriptionId: this.subscription.subscriptionId,
        },
      });
    },
    onAssignUnAssignError() {
      this.isAssignUnassignDisabled = false;
    },
    onAssignUnAssignStart() {
      this.isAssignUnassignDisabled = true;
    },
    downloadAssignedUsersReport() {
      this.loadingCsv = true;
      PdaService.getCsvReport(
        this.vendorName.toLowerCase(),
        'users',
        {
          partnerId: this.partnerGuid,
          companyId: this.company.guid,
          requestedFileName: 'Assigned Users.csv',
          csvHeaderToField: {
            'Company Name': 'companyName',
            'User Name': 'name',
            'User Email': 'email',
            'License Assigned': 'license',
          },
          dataObjectDefinition: `{ name: data.name, email: data.email, companyName: '${this.company.name}', license: '${this.subscription.product?.name}' }`,
          search: [
            {
              operator: 'CONTAINS',
              searchBy: [{
                path: 'data.licenses.*.offerIds[]',
                value: this.subscription.product?.vendorSku?.toLowerCase(),
              }],
            },
            {
              operator: 'NOT_EQUALS',
              searchBy: [{
                path: 'data.deleted',
                value: 'true',
              }],
            },
          ],
        },
      ).catch(e => this.$notify.error(this.$t('errors.downloadCSVFail', { err: e.message })))
        .finally(() => {
          this.loadingCsv = false;
        });
    },
    getDataFromMicrosoft() {
      this.error = null;
      this.loadingMicrosoftMeta = true;
      this.showMicrosoftLoadingWarning = true;
      return this.mapCompany()
        .catch((e) => {
          this.error = e.message;
        })
        .finally(() => {
          this.$asyncComputed.licenses.update();
          this.loadingMicrosoftMeta = false;
          this.showMicrosoftLoadingWarning = false;
        });
    },
    mapCompany() {
      return this.rapService.getCompanyMap(
        this.company.guid,
        this.companyTenantId,
        {
          resourceParams: {
            companyGuid: this.company?.guid,
            partnerGuid: this.partnerGuid,
            vendorGuid: this.vendor?.id,
          },
        },
        {
          partner: {
            id: this.partnerGuid,
            country: this.partner?.country,
          },
          company: {
            id: this.company?.guid,
          },
          vendor: {
            id: this.vendor?.id,
          },
        },
      ).then(this.getCachedData);
    },
    getCachedData() {
      return PdaService.getData(
        this.vendorName.toLowerCase(),
        'company',
        {
          partnerId: this.partnerGuid,
          companyId: this.company?.guid,
          version: PdaService.getCurrentVersionForData(),
        },
      ).then((r) => {
        this.companyMeta = { ...r.data };
      });
    },
    getUsers(params) {
      if (!this.partnerGuid || !this.company?.guid) {
        return Promise.resolve({ records: [], total: 0 });
      }

      this.loadingUsers = true;
      const offset = params.offset ?? 0;
      const max = params.max ?? 10;
      const page = offset / max;

      return PdaService.queryRecords(
        this.vendorName.toLowerCase(),
        'users',
        {
          partnerId: this.partnerGuid,
          companyIds: [this.company.guid],
          version: PdaService.getCurrentVersionForData(),
          search: [
            params.q ? {
              operator: 'CONTAINS',
              searchBy: [{
                path: 'data.name',
                value: params.q,
              }],
            } : null,
            {
              operator: this.assignedFlag ? 'CONTAINS' : 'NOT_CONTAINS',
              searchBy: [{
                path: 'data.licenses.*.offerIds',
                value: this.productVendorSku,
              }],
            },
            {
              operator: 'NOT_EQUALS',
              searchBy: [{
                path: 'data.deleted',
                value: 'true',
              }],
            },
          ].filter(it => !!it) || [],
          pageSize: max,
          page,
        },
      ).then((r) => {
        this.users = r.records.map(it => ({ ...it.data, hasLicense: this.assignedFlag, state: it.data.state || {}, status: it.isLocal ? 'local' : 'cloud' }));
        this.assigningUnassigningLicenses = reduce(this.users, (acc, it) => ({ ...acc, [it.vendorId]: false }), {});
        return { records: this.users, total: r.totalNumberOfRecords };
      }).catch(e => this.$notify.error(this.$t('gettingPdaData', { err: e })))
        .finally(() => {
          this.loadingUsers = false;
        });
    },
    getCompanyMicrosoftMeta() {
      this.loadingMicrosoftMeta = true;
      return this.getCachedData()
        .catch(this.getDataFromMicrosoft)
        .finally(() => {
          this.loadingMicrosoftMeta = false;
        });
    },
    assignUnassignLicenses() {
      this.isAssignUnassignDisabled = false;
      this.$asyncComputed.numberOfAssignedUsers.update();
      this.$asyncComputed.licenses.update();
      this.updateParams(this.searchParams);
    },
    goToPartnerCenterCompany() {
      const link = AuthenticationServiceV2.createPartnerCenterCompanyLink(this.companyTenantId);
      window.open(link, '_blank');
    },
    goToPartnerCenterUser(user) {
      const link = AuthenticationServiceV2.createPartnerCenterUserLink(this.companyTenantId, user.vendorId);
      window.open(link, '_blank');
    },
  },
};
</script>

<style lang="scss" scoped>
  .subscription-users {
    .table-title {
      margin-bottom: 5px;
    }
  }
  .company-link {
    margin: 0 5px;
  }
  .parent-space > *:not(:last-child) {
    margin-right: 1em;
  }
  .updated-at {
    font-size: 12px;
    margin-top: 4px;
  }
</style>
