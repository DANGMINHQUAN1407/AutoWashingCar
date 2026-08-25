import { useEffect, useState } from 'react';
import api, { type Vehicle, type VehicleType, type UserVoucherItem } from '../../services/api';
import { type Booking } from '../../types/booking';
import type { ReviewItem } from '../../types/review';
import { type Branch, type BranchService } from '../../types/branch';
import { type Slot } from '../../types/slot';
import { extractErrorMessage } from '../../utils/errorUtils';
import AnimatedButton from '../../components/AnimatedButton';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import StatusBadge, { type BadgeType } from '../../components/StatusBadge';
import { formatLicensePlateInput, getLicensePlateError, licensePlatePlaceholder } from '../../utils/licensePlate';
import '../Dashboard.css';

const CUSTOM_BRAND_VALUE = '__custom__';

// Helper to get local date string in YYYY-MM-DD format
function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

// Helper to check if a slot is in the past
function isSlotInPast(slotDateStr: string, slotStartTimeStr: string) {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (slotDateStr < todayStr) return true;
  if (slotDateStr > todayStr) return false;

  const timeParts = slotStartTimeStr.split(':');
  const slotHours = parseInt(timeParts[0], 10);
  const slotMinutes = parseInt(timeParts[1], 10);

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (slotHours < currentHours) return true;
  if (slotHours === currentHours && slotMinutes <= currentMinutes) return true;

  return false;
}

// Chinh sach phi huy (khop CancellationPolicy.cs cua backend)
const FREE_CANCELLATION_HOURS = 24;
const SAME_DAY_CANCELLATION_HOURS = 2;

type CancellationEstimate = {
  hoursRemaining: number;
  feeRate: number;
  feeAmount: number;
  refundAmount: number;
  isWindowClosed: boolean;
};

function estimateCancellationFee(
  slotDateStr?: string,
  slotStartTimeStr?: string,
  paidAmount = 0
): CancellationEstimate | null {
  if (!slotDateStr || !slotStartTimeStr) return null;

  const [hh, mm] = slotStartTimeStr.split(':');
  const slotStart = new Date(`${slotDateStr}T${hh.padStart(2, '0')}:${(mm ?? '00').padStart(2, '0')}:00`);
  if (Number.isNaN(slotStart.getTime())) return null;

  const hoursRemaining = (slotStart.getTime() - Date.now()) / 3600000;
  if (hoursRemaining <= 0) {
    return {
      hoursRemaining: 0,
      feeRate: 0.3,
      feeAmount: 0,
      refundAmount: 0,
      isWindowClosed: true,
    };
  }

  const feeRate =
    hoursRemaining >= FREE_CANCELLATION_HOURS
      ? 0
      : hoursRemaining >= SAME_DAY_CANCELLATION_HOURS
        ? 0.1
        : 0.3;
  const feeAmount = Math.round(paidAmount * feeRate);

  return {
    hoursRemaining,
    feeRate,
    feeAmount,
    refundAmount: Math.max(paidAmount - feeAmount, 0),
    isWindowClosed: false,
  };
}

// Backend tra ve chuoi UTC khong kem hau to 'Z' — them vao truoc khi parse
// de tranh trinh duyet hieu nham la gio local.
function parseUtcDate(value?: string): Date | null {
  if (!value) return null;
  const normalized = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Gioi han dat lich phia backend: toi da 1 don Pending con hieu luc va 3 don Confirmed
const PENDING_BOOKING_EXPIRY_MINUTES = 15;
const MAX_PENDING_BOOKINGS = 1;
const MAX_CONFIRMED_BOOKINGS = 3;

export default function CustomerBookings() {
  // Helper to load cached wizard state from sessionStorage
  const getCached = (key: string, fallback: any) => {
    // Nếu bước lưu trữ đã là bước 5 (đã hoàn thành đặt lịch), ta không hồi phục lại wizard
    const cachedStep = sessionStorage.getItem('booking_wizard_wizardStep');
    if (cachedStep !== null) {
      try {
        const stepNum = JSON.parse(cachedStep);
        if (stepNum === 5) {
          if (key === 'wizardStep') return 1;
          if (key === 'viewMode') return 'list';
        }
      } catch { }
    }

    const val = sessionStorage.getItem(`booking_wizard_${key}`);
    if (val === null) return fallback;
    try {
      const parsed = JSON.parse(val);
      if (key === 'wizardStep' && parsed === 5) return 1;
      return parsed;
    } catch {
      return val;
    }
  };

  // Navigation & filtering states
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>(() => getCached('viewMode', 'list'));
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingList, setLoadingList] = useState(true);

  // Master lists
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<BranchService[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Selection states for Booking Wizard
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(() => Number(getCached('wizardStep', 1)) as any);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => getCached('selectedBranchId', ''));
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => getCached('selectedVehicleId', ''));
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => getCached('selectedServiceIds', []));
  const [selectedDate, setSelectedDate] = useState<string>(() => getCached('selectedDate', getLocalDateString()));
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => getCached('selectedSlotId', ''));

  // Service filtering & pagination in Wizard Step 3
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [addonPage, setAddonPage] = useState(1);
  const ADDON_PAGE_SIZE = 6;

  // Dynamic pricing & booking output
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newBooking, setNewBooking] = useState<Booking | null>(null);

  // Inline Vehicle form
  const [showQuickVehicle, setShowQuickVehicle] = useState(false);
  const [quickPlate, setQuickPlate] = useState('');
  const [isQuickPlateComposing, setIsQuickPlateComposing] = useState(false);
  const [quickBrand, setQuickBrand] = useState('');
  const [quickBrandCatalogId, setQuickBrandCatalogId] = useState('');
  const [quickModel, setQuickModel] = useState('');
  const [quickType, setQuickType] = useState<VehicleType>(2);
  const [quickYear, setQuickYear] = useState('');
  const [quickEngineType, setQuickEngineType] = useState<'' | number>('');
  const [quickBodyStyle, setQuickBodyStyle] = useState<'' | number>('');
  const [quickEngineCatalogId, setQuickEngineCatalogId] = useState<string>('');
  const [quickBodyStyleCatalogId, setQuickBodyStyleCatalogId] = useState<string>('');
  const [brandCatalogs, setBrandCatalogs] = useState<any[]>([]);
  const [engineCatalogs, setEngineCatalogs] = useState<any[]>([]);
  const [bodyStyleCatalogs, setBodyStyleCatalogs] = useState<any[]>([]);
  const [quickVehicleLoading, setQuickVehicleLoading] = useState(false);

  // Modals & Details view states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  // General Notification alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voucher selection states
  const [myAvailableVouchers, setMyAvailableVouchers] = useState<UserVoucherItem[]>([]);
  const [selectedUserVoucherId, setSelectedUserVoucherId] = useState<string>(() => getCached('selectedUserVoucherId', ''));
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>(() => getCached('selectedVoucherCode', ''));
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Review states
  const [userReviews, setUserReviews] = useState<ReviewItem[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookingToReview, setBookingToReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
  const [reviewModalError, setReviewModalError] = useState<string | null>(null);
  const [enableStaffReview, setEnableStaffReview] = useState(false);
  const [staffRating, setStaffRating] = useState(5);
  const [staffComment, setStaffComment] = useState('');

  // Loyalty Points redemption states
  const [redeemMode, setRedeemMode] = useState<number>(() => Number(getCached('redeemMode', 0))); // 0 = Do not redeem, 1 = Redeem all, 2 = Redeem custom
  const [redeemPoints, setRedeemPoints] = useState<number>(() => Number(getCached('redeemPoints', 0)));
  const [userPoints, setUserPoints] = useState<number>(0);
  const [customRedeemInput, setCustomRedeemInput] = useState<string>('');
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Sync wizard state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('booking_wizard_viewMode', JSON.stringify(viewMode));
    sessionStorage.setItem('booking_wizard_wizardStep', JSON.stringify(wizardStep));
    sessionStorage.setItem('booking_wizard_selectedBranchId', JSON.stringify(selectedBranchId));
    sessionStorage.setItem('booking_wizard_selectedVehicleId', JSON.stringify(selectedVehicleId));
    sessionStorage.setItem('booking_wizard_selectedServiceIds', JSON.stringify(selectedServiceIds));
    sessionStorage.setItem('booking_wizard_selectedDate', JSON.stringify(selectedDate));
    sessionStorage.setItem('booking_wizard_selectedSlotId', JSON.stringify(selectedSlotId));
    sessionStorage.setItem('booking_wizard_selectedUserVoucherId', JSON.stringify(selectedUserVoucherId));
    sessionStorage.setItem('booking_wizard_selectedVoucherCode', JSON.stringify(selectedVoucherCode));
    sessionStorage.setItem('booking_wizard_redeemMode', JSON.stringify(redeemMode));
    sessionStorage.setItem('booking_wizard_redeemPoints', JSON.stringify(redeemPoints));
  }, [viewMode, wizardStep, selectedBranchId, selectedVehicleId, selectedServiceIds, selectedDate, selectedSlotId, selectedUserVoucherId, selectedVoucherCode, redeemMode, redeemPoints]);

  const handleOpenReviewModal = (booking: Booking) => {
    setBookingToReview(booking);
    setReviewRating(5);
    setReviewComment('');
    setEnableStaffReview(false);
    setStaffRating(5);
    setStaffComment('');
    setReviewModalError(null);
    setShowReviewModal(true);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToReview) return;
    setReviewSubmitLoading(true);
    setReviewModalError(null);
    try {
      // 1. Submit Service Review (Type: 1)
      await api.createReview({
        bookingId: bookingToReview.bookingId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        reviewType: 1,
      });

      // 2. Submit Staff Review (Type: 2) if selected
      let staffReviewFailed = false;
      if (enableStaffReview) {
        try {
          await api.createReview({
            bookingId: bookingToReview.bookingId,
            rating: staffRating,
            comment: staffComment.trim() || undefined,
            reviewType: 2,
          });
        } catch (err) {
          staffReviewFailed = true;
          console.error('Failed to submit staff review', err);
        }
      }

      if (staffReviewFailed) {
        setSuccessMsg(
          'Gửi đánh giá dịch vụ thành công, tuy nhiên không gửi được đánh giá nhân viên.'
        );
      } else {
        setSuccessMsg('Gửi đánh giá thành công!');
      }
      setShowReviewModal(false);
      setBookingToReview(null);
      fetchMyBookings();
    } catch (err) {
      setReviewModalError(extractErrorMessage(err, 'Failed to submit review.'));
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  // Load bookings list (fetches latest 100 items for client-side filtering & paging)
  const fetchMyBookings = async () => {
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const [bookingsRes, reviewsRes] = await Promise.all([
        api.getMyBookings({ page: 1, pageSize: 100 }),
        api.getMyReviews({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ]);
      setBookings(bookingsRes.items || []);
      setUserReviews(reviewsRes.items || []);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to load bookings list.'));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  // Auto refresh booking details when modal is open and booking is active (status 1 to 4)
  useEffect(() => {
    if (!showDetailsModal || !selectedBooking) return;

    const activeStatuses = [1, 2, 3, 4];
    if (!activeStatuses.includes(selectedBooking.bookingStatus)) return;

    const interval = setInterval(async () => {
      try {
        const updatedDetail = await api.getBookingById(selectedBooking.bookingId);
        if (updatedDetail.bookingStatus !== selectedBooking.bookingStatus) {
          setSelectedBooking(updatedDetail);
          fetchMyBookings();
        }
      } catch (err) {
        console.error('Error auto-refreshing booking status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [showDetailsModal, selectedBooking?.bookingId, selectedBooking?.bookingStatus]);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Parse payment status redirect query parameters from VNPay callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('paymentStatus');
    const message = params.get('message');
    if (paymentStatus === 'success') {
      setSuccessMsg(message || 'Online payment successful!');
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchMyBookings();
    } else if (paymentStatus === 'failed') {
      setErrorMsg(message || 'Online payment failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load master data when entering wizard
  const initWizardData = async () => {
    setErrorMsg(null);
    setBranchesLoading(true);
    try {
      const [branchRes, vehicleRes, brandRes, engineRes, bodyStyleRes] = await Promise.all([
        api.getBranches({ isActive: true }),
        api.getMyVehicles(),
        api.getVehicleBrands({ isActive: true, page: 1, pageSize: 9999 }),
        api.getEngineTypes({ isActive: true, page: 1, pageSize: 9999 }),
        api.getBodyStyles({ isActive: true, page: 1, pageSize: 9999 }),
      ]);
      setBranches(branchRes.items || []);
      setVehicles(vehicleRes || []);
      setBrandCatalogs(brandRes.items || []);
      setEngineCatalogs(engineRes.items || []);
      setBodyStyleCatalogs(bodyStyleRes.items || []);

      // Auto select first branch if available and no valid cached branch is selected
      if (branchRes?.items && branchRes.items.length > 0) {
        const cachedBranch = sessionStorage.getItem('booking_wizard_selectedBranchId');
        const parsedBranch = cachedBranch ? JSON.parse(cachedBranch) : '';
        const existsBranch = branchRes.items.some((b: any) => b.branchId === parsedBranch);
        if (!parsedBranch || !existsBranch) {
          setSelectedBranchId(branchRes.items[0].branchId);
        }
      }

      // Auto select first vehicle if available and no valid cached vehicle is selected
      if (vehicleRes && vehicleRes.length > 0) {
        const firstId = vehicleRes[0].VehicleId || vehicleRes[0].vehicleId;
        const cachedVehicle = sessionStorage.getItem('booking_wizard_selectedVehicleId');
        const parsedCached = cachedVehicle ? JSON.parse(cachedVehicle) : '';
        const existsInFetched = vehicleRes.some((v: any) => (v.VehicleId || v.vehicleId) === parsedCached);
        if (firstId && (!parsedCached || !existsInFetched)) {
          setSelectedVehicleId(firstId);
        }
      }
      return branchRes.items || [];
    } catch (err) {
      console.error('Failed to load branch or vehicle information:', err);
      return [];
    } finally {
      setBranchesLoading(false);
    }
  };

  // Restore wizard data on mount if viewMode is cached as 'wizard'
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasService = params.get('serviceId');
    const hasStart = params.get('startBooking') === 'true';
    const queryBranchId = params.get('branchId');

    // Only auto-restore if we are not explicitly starting a brand new wizard from query params
    if (!hasService && !hasStart && !queryBranchId) {
      const cachedViewMode = sessionStorage.getItem('booking_wizard_viewMode');
      if (cachedViewMode && JSON.parse(cachedViewMode) === 'wizard') {
        initWizardData();
      }
    }
  }, []);

  const handleStartWizard = () => {
    setViewMode('wizard');
    setWizardStep(1);
    setSelectedBranchId('');
    setSelectedServiceIds([]);
    setSelectedSlotId('');
    setQuote(null);
    setNewBooking(null);
    setSelectedUserVoucherId('');
    setSelectedVoucherCode('');
    setVoucherCodeInput('');
    setVoucherError(null);
    setRedeemMode(0);
    setRedeemPoints(0);
    setCustomRedeemInput('');
    setRedeemError(null);
    setErrorMsg(null);
    initWizardData();
  };

  // Check for startBooking or serviceId or branchId on mount to auto-trigger the wizard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasService = params.get('serviceId');
    const hasStart = params.get('startBooking') === 'true';
    const queryBranchId = params.get('branchId');

    if (hasService || hasStart || queryBranchId) {
      setViewMode('wizard');
      setWizardStep(1);
      setSelectedSlotId('');
      setSelectedBranchId('');
      setSelectedServiceIds([]);
      setQuote(null);
      setNewBooking(null);
      setSelectedUserVoucherId('');
      setSelectedVoucherCode('');
      setVoucherCodeInput('');
      setVoucherError(null);
      setRedeemMode(0);
      setRedeemPoints(0);
      setCustomRedeemInput('');
      setRedeemError(null);
      setErrorMsg(null);
      initWizardData().then(async fetchedBranches => {
        if (queryBranchId) {
          setSelectedBranchId(queryBranchId);
        } else if (hasService && fetchedBranches && fetchedBranches.length > 0) {
          // Auto-select a branch that offers the requested service
          for (const b of fetchedBranches) {
            try {
              const services = await api.getBranchServices(b.branchId);
              if (services.some(s => s.serviceId === hasService && s.isActive)) {
                setSelectedBranchId(b.branchId);
                break;
              }
            } catch (err) { }
          }
        }
      });
    }
  }, []);

  // Load branch services when branch or vehicle changes
  useEffect(() => {
    if (!selectedBranchId) {
      setServices([]);
      return;
    }
    const fetchServices = async () => {
      try {
        const currentVeh = vehicles.find(v => (v.VehicleId || v.vehicleId) === selectedVehicleId);
        const vType = currentVeh ? (currentVeh.VehicleType ?? currentVeh.vehicleType) : undefined;
        const eCatId = currentVeh ? (currentVeh.EngineCatalogId ?? currentVeh.engineCatalogId ?? undefined) : undefined;

        // Fetch catalog tailored to branch and vehicle type + engine pricing
        const catalogRes = await api.getServiceCatalog({
          branchId: selectedBranchId,
          vehicleType: vType,
          engineCatalogId: eCatId,
          isActive: true,
          pageSize: 100,
        });

        if (catalogRes?.items && catalogRes.items.length > 0) {
          const mappedServices: BranchService[] = catalogRes.items
            .filter(item => {
              if (vType) {
                return item.vehicleType === vType || item.vehicleType === null || item.vehicleType === undefined;
              }
              return true;
            })
            .map(item => ({
              branchServiceId: item.serviceCatalogItemId || '',
              branchId: selectedBranchId,
              serviceId: item.serviceCatalogItemId || '',
              serviceName: item.serviceName || item.name || '',
              description: item.description || '',
              basePrice: (item.applicablePrice != null && item.applicablePrice > 0 ? item.applicablePrice : item.basePrice) || 0,
              durationMinutes: (item.applicableDurationMinutes != null && item.applicableDurationMinutes > 0 ? item.applicableDurationMinutes : item.durationMinutes) || 0,
              vehicleType: item.vehicleType ?? undefined,
              vehicleTypeName: item.vehicleTypeName,
              servicePackageType: item.servicePackageType || 1,
              isActive: item.isActive ?? true,
            }));
          setServices(mappedServices);

          // Keep previously selected services if still available
          setSelectedServiceIds(prev => prev.filter(id => mappedServices.some(s => s.serviceId === id)));
        } else {
          // Fallback to getBranchServices if needed
          const items = await api.getBranchServices(selectedBranchId);
          const activeServices = items
            .filter(s => s.isActive)
            .filter(s => !vType || s.vehicleType === vType || !s.vehicleType) || [];
          setServices(activeServices);
          setSelectedServiceIds(prev => prev.filter(id => activeServices.some(s => s.serviceId === id)));
        }
      } catch (err) {
        console.error('Failed to load branch services:', err);
        setServices([]);
      }
    };
    fetchServices();
  }, [selectedBranchId, selectedVehicleId, vehicles]);

  // Load slots when branch or date changes
  useEffect(() => {
    if (!selectedBranchId || !selectedDate) {
      setSlots([]);
      return;
    }
    const fetchSlots = async () => {
      try {
        const list = await api.getAvailableSlots(selectedBranchId, selectedDate);
        setSlots(list || []);
      } catch (err) {
        console.error('Error loading slots:', err);
        setSlots([]);
      }
    };
    fetchSlots();
    setSelectedSlotId('');
  }, [selectedBranchId, selectedDate]);

  // Fetch available vouchers when branch changes in wizard
  useEffect(() => {
    if (viewMode !== 'wizard' || !selectedBranchId) {
      setMyAvailableVouchers([]);
      setSelectedUserVoucherId('');
      setVoucherCodeInput('');
      setVoucherError(null);
      return;
    }

    const fetchVouchers = async () => {
      try {
        const res = await api.getMyVouchers({
          voucherStatus: 1, // Active / Unused
          branchId: selectedBranchId,
          pageSize: 100,
        });
        setMyAvailableVouchers(res.items || []);
      } catch (err) {
        console.error('Failed to fetch user vouchers:', err);
      }
    };
    fetchVouchers();
  }, [viewMode, selectedBranchId]);

  // Fetch user loyalty points when entering booking wizard
  useEffect(() => {
    if (viewMode !== 'wizard') return;
    const fetchLoyaltyPoints = async () => {
      try {
        const res = await api.getMyLoyalty();
        const pts = res?.currentPoints ?? res?.CurrentPoints ?? 0;
        setUserPoints(pts);
      } catch (err) {
        console.error('Failed to fetch loyalty points:', err);
      }
    };
    fetchLoyaltyPoints();
  }, [viewMode]);

  // Fetch Quote when slot, services selection, voucher, or loyalty points changes
  useEffect(() => {
    if (wizardStep !== 4 || !selectedSlotId || selectedServiceIds.length === 0) {
      return;
    }

    const fetchQuote = async () => {
      setQuoteLoading(true);
      setErrorMsg(null);
      try {
        const payload: any = {
          SlotInventoryId: selectedSlotId,
          VehicleId: selectedVehicleId || undefined,
          Services: selectedServiceIds.map(id => ({ ServiceCatalogItemId: id, Quantity: 1 })),
          RedeemMode: redeemMode,
          RedeemPoints: redeemPoints,
        };
        if (selectedUserVoucherId) {
          payload.UserVoucherId = selectedUserVoucherId;
        } else if (selectedVoucherCode) {
          payload.VoucherCode = selectedVoucherCode;
        }
        const data = await api.getBookingQuote(payload);
        setQuote(data);
      } catch (err) {
        setErrorMsg(extractErrorMessage(err, 'Failed to calculate booking quote.'));
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };
    fetchQuote();
  }, [
    wizardStep,
    selectedSlotId,
    selectedVehicleId,
    selectedServiceIds,
    selectedUserVoucherId,
    selectedVoucherCode,
    redeemMode,
    redeemPoints,
  ]);

  // Inline Quick Add Vehicle submission
  const handleQuickVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlate.trim()) return;
    setQuickVehicleLoading(true);
    setErrorMsg(null);
    try {
      const plateError = getLicensePlateError(quickPlate, quickType);
      if (plateError) {
        setErrorMsg(plateError);
        return;
      }

      const data = await api.createVehicle({
        LicensePlate: formatLicensePlateInput(quickPlate, quickType),
        VehicleType: quickType,
        Brand: quickBrand.trim() || undefined,
        BrandCatalogId: quickBrandCatalogId && quickBrandCatalogId !== CUSTOM_BRAND_VALUE ? quickBrandCatalogId : undefined,
        Model: quickModel.trim() || undefined,
        ManufactureYear: quickYear ? Number(quickYear) : undefined,
        EngineType: quickEngineType !== '' ? Number(quickEngineType) : undefined,
        BodyStyle: quickBodyStyle !== '' ? Number(quickBodyStyle) : undefined,
        EngineCatalogId: quickEngineCatalogId || undefined,
        BodyStyleCatalogId: quickBodyStyleCatalogId || undefined,
      });
      const vId = data.VehicleId || data.vehicleId;
      setVehicles(prev => [data, ...prev]);
      if (vId) {
        setSelectedVehicleId(vId);
      }
      setQuickPlate('');
      setQuickBrand('');
      setQuickBrandCatalogId('');
      setQuickModel('');
      setQuickYear('');
      setQuickEngineType('');
      setQuickBodyStyle('');
      setQuickEngineCatalogId('');
      setQuickBodyStyleCatalogId('');
      setShowQuickVehicle(false);
      setSuccessMsg('Đăng ký xe mới thành công!');
    } catch (err) {
      let friendlyError = 'Không thể đăng ký xe mới.';
      const errorObj = err as { message?: string; Message?: string } | null;
      const errorString = errorObj?.message || errorObj?.Message || '';
      if (errorString.toLowerCase().includes('already exists') || errorString.toLowerCase().includes('trùng') || errorString.toLowerCase().includes('conflict') || errorString.includes('409')) {
        friendlyError = 'Biển số xe này đã được đăng ký bởi tài khoản khác trong hệ thống.';
      }
      setErrorMsg(extractErrorMessage(err, friendlyError));
    } finally {
      setQuickVehicleLoading(false);
    }
  };

  // Final booking submission
  const handleConfirmBooking = async () => {
    if (!selectedVehicleId || !selectedSlotId || selectedServiceIds.length === 0) {
      setErrorMsg('Please complete all details before booking.');
      return;
    }
    setSubmitLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        VehicleId: selectedVehicleId,
        SlotInventoryId: selectedSlotId,
        Services: selectedServiceIds.map(id => ({ ServiceCatalogItemId: id, Quantity: 1 })),
        RedeemMode: redeemMode,
        RedeemPoints: redeemPoints,
      };
      if (selectedUserVoucherId) {
        payload.UserVoucherId = selectedUserVoucherId;
      } else if (selectedVoucherCode) {
        payload.VoucherCode = selectedVoucherCode;
      }
      const booking = await api.createBooking(payload);
      setNewBooking(booking);
      setWizardStep(5);
      fetchMyBookings();
      // Clear cached booking wizard state
      const keys = [
        'viewMode', 'wizardStep', 'selectedBranchId', 'selectedVehicleId',
        'selectedServiceIds', 'selectedDate', 'selectedSlotId',
        'selectedUserVoucherId', 'selectedVoucherCode', 'redeemMode', 'redeemPoints'
      ];
      keys.forEach(k => sessionStorage.removeItem(`booking_wizard_${k}`));
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to save appointment.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  // Trigger online payment redirect
  const handlePaymentRedirect = async (bookingId: string, payFull: boolean) => {
    setErrorMsg(null);
    try {
      const res = await api.createPaymentDeposit({ BookingId: bookingId, PayFull: payFull });
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        throw new Error('Did not receive payment URL from server.');
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to initialize payment.'));
    }
  };

  // Booking cancellation handler
  const handleCancelBookingClick = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelReason('');
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setErrorMsg(null);
    try {
      await api.cancelBooking(bookingToCancel.bookingId, cancelReason.trim());
      setSuccessMsg(`Successfully cancelled booking ${bookingToCancel.bookingCode}.`);
      setShowCancelConfirm(false);
      setBookingToCancel(null);
      fetchMyBookings();

      // Close details modal if open
      if (selectedBooking?.bookingId === bookingToCancel.bookingId) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to cancel this booking.'));
    }
  };

  // View details modal trigger
  const handleViewDetails = async (booking: Booking) => {
    setErrorMsg(null);
    try {
      const detail = await api.getBookingById(booking.bookingId);
      setSelectedBooking(detail);
      setShowDetailsModal(true);
    } catch (err) {
      // Fallback to current item if detail fetch fails
      setSelectedBooking(booking);
      setShowDetailsModal(true);
    }
  };

  // Status mapping labels and classes
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return 'Chờ thanh toán cọc';
      case 2:
        return 'Đã xác nhận';
      case 3:
        return 'Đã Check-in';
      case 4:
        return 'Đang thực hiện';
      case 5:
        return 'Hoàn thành';
      case 6:
        return 'Đã đóng';
      case 7:
        return 'Đã hủy';
      case 8:
        return 'Vắng mặt';
      default:
        return 'Không xác định';
    }
  };

  const getStatusClass = (status: number): BadgeType => {
    switch (status) {
      case 1:
        return 'primary'; // pending
      case 2:
        return 'success'; // confirmed
      case 3:
        return 'warning'; // checked in
      case 4:
        return 'primary'; // in progress
      case 5:
        return 'success'; // completed
      case 6:
        return 'success'; // closed
      case 7:
        return 'danger'; // cancelled
      case 8:
        return 'danger'; // no-show
      default:
        return 'secondary';
    }
  };

  const getVehicleLabel = (type?: number) => {
    if (type === 1) return 'Xe máy';
    if (type === 3) return 'Xe tải';
    return 'Ô tô';
  };

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter(b => {
    const isPast = Boolean(b.slotDate && b.slotStartTime && isSlotInPast(b.slotDate, b.slotStartTime));
    if (activeTab === 'upcoming') {
      // Pending (1): Luôn hiển thị để khách có thể thanh toán cọc hoặc hủy đơn
      if (b.bookingStatus === 1) return true;
      // Checked In (3) & In Progress (4): Đang được phục vụ tại gara
      if (b.bookingStatus === 3 || b.bookingStatus === 4) return true;
      // Confirmed (2): Hiển thị nếu lịch hẹn chưa trôi qua
      if (b.bookingStatus === 2) return !isPast;
      return false;
    }
    if (activeTab === 'history') {
      // Completed (5), Closed (6), Cancelled (7), No Show (8)
      if (b.bookingStatus >= 5) return true;
      // Confirmed cũ đã qua thời gian hẹn
      if (b.bookingStatus === 2 && isPast) return true;
      return false;
    }
    return true;
  });

  // Kiem tra gioi han dat lich truoc khi cho phep sang Buoc 2
  const activePendingBookings = bookings.filter(b => {
    if (b.bookingStatus !== 1) return false;
    const createdAt = parseUtcDate(b.createdAtUtc);
    if (!createdAt) return true;
    return Date.now() - createdAt.getTime() < PENDING_BOOKING_EXPIRY_MINUTES * 60 * 1000;
  });
  const confirmedBookingsCount = bookings.filter(b => b.bookingStatus === 2).length;
  const bookingLimitMessage =
    activePendingBookings.length >= MAX_PENDING_BOOKINGS
      ? `Bạn đang có ${activePendingBookings.length} đơn chờ thanh toán (hết hạn sau ${PENDING_BOOKING_EXPIRY_MINUTES} phút kể từ lúc tạo). Vui lòng hoàn tất hoặc huỷ đơn đó trước khi đặt lịch mới.`
      : confirmedBookingsCount >= MAX_CONFIRMED_BOOKINGS
        ? `Bạn đã có ${confirmedBookingsCount} lịch hẹn đã xác nhận — đạt giới hạn ${MAX_CONFIRMED_BOOKINGS} đơn. Vui lòng hoàn tất hoặc huỷ bớt trước khi đặt thêm.`
        : null;

  // Dynamic client-side total pages computation
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredBookings.length / 3));
    setTotalPages(pages);
  }, [filteredBookings.length]);

  const paginatedBookings = filteredBookings.slice((page - 1) * 3, page * 3);

  // Format currency helper
  const formatVND = (value?: number) => {
    if (value === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  };

  const handleApplyVoucherCode = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;

    setQuoteLoading(true);
    setVoucherError(null);
    try {
      const testQuote = await api.getBookingQuote({
        SlotInventoryId: selectedSlotId,
        VehicleId: selectedVehicleId || undefined,
        Services: selectedServiceIds.map(id => ({ ServiceCatalogItemId: id, Quantity: 1 })),
        VoucherCode: code,
        RedeemMode: redeemMode,
        RedeemPoints: redeemPoints,
      });
      setSelectedUserVoucherId(''); // Clear dropdown selection
      setSelectedVoucherCode(code);
      setQuote(testQuote);
      setVoucherError(null);
    } catch (err: any) {
      setVoucherError(
        extractErrorMessage(
          err,
          'Mã giảm giá không hợp lệ hoặc không áp dụng được cho chi nhánh này.'
        )
      );
      setSelectedVoucherCode('');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleApplyRedeemPoints = () => {
    setRedeemError(null);
    const pts = parseInt(customRedeemInput.trim(), 10);
    if (isNaN(pts) || pts < 1000) {
      setRedeemError('Số điểm quy đổi tối thiểu là 1,000 điểm.');
      return;
    }
    if (pts > userPoints) {
      setRedeemError(
        `Số điểm quy đổi không thể vượt quá điểm tích lũy khả dụng (${userPoints.toLocaleString()} điểm).`
      );
      return;
    }
    setRedeemMode(2);
    setRedeemPoints(pts);
  };

  const handleRedeemModeChange = (mode: number) => {
    setRedeemError(null);
    if (mode === 0) {
      setRedeemMode(0);
      setRedeemPoints(0);
      setCustomRedeemInput('');
    } else if (mode === 1) {
      setRedeemMode(1);
      setRedeemPoints(userPoints);
      setCustomRedeemInput('');
    } else if (mode === 2) {
      setRedeemMode(2);
      setRedeemPoints(0);
    }
  };

  return (
    <div className="portal-page">
      <div className="dash-header">
        <div>
          <h2>Đặt lịch rửa xe</h2>
          <p>Đặt lịch chăm sóc xe và theo dõi tiến trình phục vụ dễ dàng.</p>
        </div>
        {viewMode === 'list' && (
          <AnimatedButton type="button" variant="primary" onClick={handleStartWizard}>
            + Đặt lịch mới
          </AnimatedButton>
        )}
      </div>

      {/* Global Toast Messages */}
      {successMsg && (
        <div
          className="badge badge-success"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '14px 20px',
            fontSize: '0.95rem',
          }}
        >
          <span>{successMsg}</span>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => setSuccessMsg(null)}
          >
            ✕
          </button>
        </div>
      )}
      {errorMsg && (
        <div
          className="badge badge-danger"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '14px 20px',
            fontSize: '0.95rem',
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => setErrorMsg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          <div className="bookings-filter-tabs">
            <button
              type="button"
              className={`bookings-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Sắp diễn ra
            </button>
            <button
              type="button"
              className={`bookings-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Lịch sử
            </button>
          </div>

          <div className="booking-list">
            {loadingList ? (
              <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '40px' }}>
                Đang tải danh sách lịch hẹn...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '40px' }}>
                Không tìm thấy lịch hẹn nào. Bấm "+ Đặt lịch mới" để đặt lịch ngay!
              </div>
            ) : (
              paginatedBookings.map(b => {
                const isActive = b.bookingStatus === 1 || b.bookingStatus === 2;
                return (
                  <div
                    key={b.bookingId}
                    className={`booking-card ${isActive ? 'active-booking' : ''}`}
                  >
                    {isActive && <div className="booking-status-indicator" />}
                    <div className="booking-main">
                      <div className="booking-header">
                        <h4>Mã đơn: {b.bookingCode}</h4>
                        <StatusBadge
                          type={getStatusClass(b.bookingStatus)}
                          label={getStatusLabel(b.bookingStatus)}
                        />
                      </div>
                      <div className="booking-details">
                        <span>
                          <strong>Ngày:</strong> {b.slotDate || 'Chưa lên lịch'}
                        </span>
                        <span>
                          <strong>Giờ:</strong>{' '}
                          {b.slotStartTime ? b.slotStartTime.substring(0, 5) : 'Chưa lên lịch'}
                        </span>
                        <span>
                          <strong>Tổng tiền:</strong> {formatVND(b.bookingFinalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="booking-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleViewDetails(b)}
                      >
                        {b.bookingStatus >= 1 && b.bookingStatus <= 4
                          ? '🔍 Chi tiết & Theo dõi'
                          : 'Chi tiết'}
                      </button>
                      {b.bookingStatus === 1 && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePaymentRedirect(b.bookingId, false)}
                        >
                          Thanh toán cọc
                        </button>
                      )}
                      {(b.bookingStatus === 1 || b.bookingStatus === 2) && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelBookingClick(b)}
                        >
                          Hủy lịch
                        </button>
                      )}
                      {(b.bookingStatus === 5 || b.bookingStatus === 6) &&
                        (() => {
                          const review = userReviews.find(
                            r => r.bookingId === b.bookingId && r.reviewType === 1
                          );
                          if (review) {
                            return (
                              <span
                                style={{
                                  fontSize: '0.9rem',
                                  color: '#ffb229',
                                  alignSelf: 'center',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginRight: '6px',
                                }}
                              >
                                ★ {review.rating}/5
                              </span>
                            );
                          } else {
                            return (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{
                                  background: 'var(--color-success)',
                                  borderColor: 'var(--color-success)',
                                }}
                                onClick={() => handleOpenReviewModal(b)}
                              >
                                Review
                              </button>
                            );
                          }
                        })()}
                    </div>
                  </div>
                );
              })
            )}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={filteredBookings.length}
              itemName="lịch hẹn"
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* STEPPED BOOKING WIZARD */}
      {viewMode === 'wizard' && (
        <div className="booking-wizard-card card">
          {/* Header Progress Steps */}
          {wizardStep <= 4 && (
            <div className="wizard-steps">
              <div
                className={`wizard-step-node ${wizardStep === 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}
              >
                <div className="step-number">1</div>
                <div className="step-label">Chọn chi nhánh</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}
              >
                <div className="step-number">2</div>
                <div className="step-label">Chọn phương tiện</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}
              >
                <div className="step-number">3</div>
                <div className="step-label">Chọn ngày &amp; giờ</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 4 ? 'active' : ''} ${wizardStep > 4 ? 'completed' : ''}`}
              >
                <div className="step-number">4</div>
                <div className="step-label">Báo giá &amp; Xác nhận</div>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT BRANCH & CHOOSE PRELIMINARY SERVICES */}
          {wizardStep === 1 && (
            <div>
              <h3>Bước 1: Chọn chi nhánh</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Vui lòng chọn chi nhánh thuận tiện nhất cho bạn.
              </p>

              {bookingLimitMessage && (
                <div
                  className="badge badge-warning"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}
                >
                  ⚠️ {bookingLimitMessage}
                </div>
              )}

              {branchesLoading ? (
                <p>Đang tải danh sách chi nhánh...</p>
              ) : branches.length === 0 ? (
                <p>Chưa có chi nhánh nào hoạt động. Vui lòng liên hệ trung tâm để được hỗ trợ.</p>
              ) : (
                <div className="wizard-selection-grid">
                  {branches.map(b => (
                    <div
                      key={b.branchId}
                      className={`wizard-card-item ${selectedBranchId === b.branchId ? 'selected' : ''}`}
                      onClick={() => setSelectedBranchId(b.branchId)}
                    >
                      <div className="wizard-card-item-indicator" />
                      <h4 style={{ color: 'var(--color-heading)', marginBottom: '8px' }}>
                        {b.name}
                      </h4>
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                        📍 {b.address}, {b.city}
                      </p>
                      {b.openTime && b.closeTime && (
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '8px',
                          }}
                        >
                          🕒 Giờ hoạt động: {b.openTime.substring(0, 5)} - {b.closeTime.substring(0, 5)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <AnimatedButton type="button" variant="ghost" onClick={() => setViewMode('list')} showArrow={false}>
                  ← Quay lại
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={!selectedBranchId || !!bookingLimitMessage}
                  onClick={() => setWizardStep(2)}
                >
                  Tiếp tục →
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT VEHICLE OR ADD VEHICLE */}
          {wizardStep === 2 && (
            <div>
              <h3>Bước 2: Chọn phương tiện</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Chọn xe bạn muốn rửa hoặc đăng ký xe mới bên dưới.
              </p>

              <div className="wizard-selection-grid">
                {vehicles.map(v => {
                  const plate = v.LicensePlate || v.licensePlate;
                  const brand = v.BrandCatalogName || v.brandCatalogName || v.Brand || v.brand || 'Chưa rõ hãng';
                  const type = v.VehicleType ?? v.vehicleType ?? 2;
                  const id = v.VehicleId || v.vehicleId;
                  const imageUrl = v.PrimaryImageUrl || v.primaryImageUrl;
                  return (
                    <div
                      key={id || plate}
                      className={`wizard-card-item ${selectedVehicleId === id ? 'selected' : ''}`}
                      onClick={() => id && setSelectedVehicleId(id)}
                    >
                      <div className="wizard-card-item-indicator" />
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={plate}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm, 8px)',
                              objectFit: 'cover',
                              border: '1px solid var(--color-border-dim, rgba(255,255,255,0.1))',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm, 8px)',
                              background: 'rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.4rem',
                              border: '1px solid var(--color-border-dim, rgba(255,255,255,0.1))',
                              flexShrink: 0,
                            }}
                          >
                            {type === 1 ? '🏍️' : type === 3 ? '🚚' : '🚗'}
                          </div>
                        )}
                        <div>
                          <h4 style={{ color: 'var(--color-heading)', margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
                            {plate}
                          </h4>
                          <p
                            style={{
                              fontSize: '0.82rem',
                              color: 'var(--color-text-muted)',
                              margin: '2px 0 0 0',
                            }}
                          >
                            {brand}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${type === 1 ? 'badge-motorbike' : 'badge-car'}`}>
                        {getVehicleLabel(type)}
                      </span>
                    </div>
                  );
                })}

                {/* Inline Add Quick Form trigger */}
                {!showQuickVehicle ? (
                  <div
                    className="wizard-card-item quick-vehicle-card"
                    onClick={() => setShowQuickVehicle(true)}
                  >
                    <div className="quick-vehicle-btn-content">
                      <span style={{ fontSize: '1.8rem' }}>➕</span>
                      <span>Đăng ký xe mới</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="wizard-card-item"
                    style={{ border: '1px solid var(--color-primary)', cursor: 'default' }}
                  >
                    <h4 style={{ marginBottom: '12px' }}>Đăng ký nhanh xe mới</h4>
                    <form
                      onSubmit={handleQuickVehicleSubmit}
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Biển số xe
                        </label>
                        <input
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickPlate}
                          onCompositionStart={() => setIsQuickPlateComposing(true)}
                          onCompositionEnd={e => {
                            const value = e.currentTarget.value;
                            setIsQuickPlateComposing(false);
                            setQuickPlate(formatLicensePlateInput(value, quickType));
                          }}
                          onChange={e => {
                            const value = e.currentTarget.value;
                            setQuickPlate(isQuickPlateComposing ? value : formatLicensePlateInput(value, quickType));
                          }}
                          placeholder={licensePlatePlaceholder(quickType)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Loại phương tiện
                        </label>
                        <select
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickType}
                          onChange={e => {
                            const nextType = Number(e.target.value) as VehicleType;
                            setQuickType(nextType);
                            setQuickPlate(prev => formatLicensePlateInput(prev, nextType));
                            setQuickBrandCatalogId('');
                            setQuickBrand('');
                            setQuickBodyStyle('');
                            setQuickBodyStyleCatalogId('');
                          }}
                        >
                          <option value={2}>Ô tô</option>
                          <option value={1}>Xe máy</option>
                          <option value={3}>Xe tải (Xe tải / xe ba gác)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Hãng xe
                        </label>
                        <select
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickBrandCatalogId}
                          onChange={e => {
                            const catId = e.target.value;
                            const matched = brandCatalogs.find(c => c.id === catId);
                            setQuickBrandCatalogId(catId);
                            setQuickBrand(catId === CUSTOM_BRAND_VALUE ? '' : matched?.name ?? '');
                          }}
                        >
                          <option value="">-- Chọn hãng xe --</option>
                          {brandCatalogs
                            .filter(cat => Number(cat.vehicleType ?? cat.VehicleType) === Number(quickType))
                            .map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          <option value={CUSTOM_BRAND_VALUE}>Khác / Tùy chỉnh</option>
                        </select>
                        {quickBrandCatalogId === CUSTOM_BRAND_VALUE && (
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.9rem', marginTop: 8 }}
                            value={quickBrand}
                            onChange={e => setQuickBrand(e.target.value)}
                            placeholder="Nhập tên hãng xe"
                            maxLength={50}
                          />
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Dòng xe (Model)
                        </label>
                        <input
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickModel}
                          onChange={e => setQuickModel(e.target.value)}
                          placeholder="VD: Camry, Civic, Future..."
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Năm sản xuất
                        </label>
                        <input
                          className="form-input"
                          type="number"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickYear}
                          onChange={e => setQuickYear(e.target.value)}
                          placeholder="VD: 2020"
                          min={1950}
                          max={new Date().getFullYear() + 1}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Loại động cơ
                        </label>
                        <select
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickEngineCatalogId}
                          onChange={e => {
                            const catId = e.target.value;
                            const matched = engineCatalogs.find(c => c.id === catId);
                            setQuickEngineCatalogId(catId);
                            setQuickEngineType(matched?.legacyEnumValue ?? '');
                          }}
                        >
                          <option value="">-- Chọn loại động cơ --</option>
                          {engineCatalogs.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group animate-slide-in">
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>
                            Kiểu dáng
                          </label>
                          <select
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                            value={quickBodyStyleCatalogId}
                            onChange={e => {
                              const catId = e.target.value;
                              const matched = bodyStyleCatalogs.find(c => c.id === catId);
                              setQuickBodyStyleCatalogId(catId);
                              setQuickBodyStyle(matched?.legacyEnumValue ?? '');
                            }}
                          >
                            <option value="">-- Chọn kiểu dáng --</option>
                            {(() => {
                              const qType = Number(quickType);
                              const opts = bodyStyleCatalogs.filter(cat => {
                                const vt = Number(cat.vehicleType ?? cat.VehicleType);
                                if (!vt || isNaN(vt)) {
                                  const leg = cat.legacyEnumValue ?? cat.LegacyEnumValue;
                                  return qType === 2 && leg != null;
                                }
                                return vt === qType;
                              });
                              return opts.length > 0
                                ? opts.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))
                                : <option disabled value="">Không có kiểu dáng cho loại xe này</option>;
                            })()}
                          </select>
                        </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <AnimatedButton
                          type="button"
                          variant="ghost"
                          style={{ flex: 1 }}
                          onClick={() => setShowQuickVehicle(false)}
                        >
                          Hủy bỏ
                        </AnimatedButton>
                        <AnimatedButton
                          type="submit"
                          variant="primary"
                          style={{ flex: 1 }}
                          disabled={quickVehicleLoading}
                        >
                          {quickVehicleLoading ? 'Đang tạo...' : 'Lưu phương tiện'}
                        </AnimatedButton>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <AnimatedButton type="button" variant="ghost" onClick={() => setWizardStep(1)} showArrow={false}>
                  ← Quay lại
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={!selectedVehicleId}
                  onClick={() => setWizardStep(3)}
                >
                  Tiếp tục →
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT SERVICES & DATE/TIME SLOT */}
          {wizardStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Bước 3: Dịch vụ &amp; Giờ hẹn
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', margin: 0 }}>
                  Vui lòng chọn các dịch vụ cần thực hiện và chọn khung giờ còn trống.
                </p>
              </div>

              {/* Main Layout Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
                {/* Left Column (Services) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Vehicle Info Card */}
                  {(() => {
                    const selVehicle = vehicles.find(v => (v.VehicleId || v.vehicleId) === selectedVehicleId);
                    const currentPlate = selVehicle ? (selVehicle.LicensePlate || selVehicle.licensePlate) : '';
                    const currentType = selVehicle ? Number(selVehicle.VehicleType ?? selVehicle.vehicleType ?? 2) : 2;
                    const currentBrand = selVehicle ? (selVehicle.BrandCatalogName || selVehicle.brandCatalogName || selVehicle.Brand || selVehicle.brand) : '';
                    const currentImg = selVehicle ? (selVehicle.PrimaryImageUrl || selVehicle.primaryImageUrl) : '';

                    return (
                      <div
                        style={{
                          background: 'rgba(2, 132, 199, 0.06)',
                          border: '1.5px solid rgba(2, 132, 199, 0.2)',
                          borderRadius: '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 2 }}>
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={currentPlate}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                objectFit: 'cover',
                                border: '1px solid rgba(2, 132, 199, 0.2)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.6rem',
                                border: '1px solid rgba(2, 132, 199, 0.2)',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                              }}
                            >
                              {currentType === 1 ? '🏍️' : currentType === 3 ? '🚚' : '🚗'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              Bảng giá áp dụng cho: {getVehicleLabel(currentType)} {currentPlate ? `[${currentPlate}]` : ''}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                              {currentBrand ? `${currentBrand} · ` : ''}Đơn giá và thời lượng dịch vụ đã tự động tối ưu hóa cho loại phương tiện này.
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✨ Chỉ hiển thị dịch vụ phù hợp với loại phương tiện này
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setWizardStep(2)}
                          style={{
                            background: '#ffffff',
                            color: '#0284c7',
                            border: '1px solid #0284c7',
                            borderRadius: '8px',
                            fontWeight: 600,
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            position: 'relative',
                            zIndex: 2,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          🔄 Đổi xe khác
                        </button>
                      </div>
                    );
                  })()}

                  {/* Search Bar */}
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 Tìm kiếm nhanh dịch vụ (ví dụ: rửa bọt tuyết, tẩy ố, dưỡng bóng, xông tinh dầu...)"
                      value={serviceSearchQuery}
                      onChange={e => {
                        setServiceSearchQuery(e.target.value);
                        setAddonPage(1);
                      }}
                      style={{
                        width: '100%',
                        fontSize: '0.92rem',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>

                  {(() => {
                    const query = serviceSearchQuery.trim().toLowerCase();
                    const allMain = services.filter(s => (s.servicePackageType ?? 1) !== 2);
                    const allAddOns = services.filter(s => (s.servicePackageType ?? 1) === 2);

                    const mainPackages = allMain.filter(s =>
                      !query ||
                      s.serviceName.toLowerCase().includes(query) ||
                      (s.description && s.description.toLowerCase().includes(query))
                    );

                    const filteredAddOns = allAddOns.filter(s =>
                      !query ||
                      s.serviceName.toLowerCase().includes(query) ||
                      (s.description && s.description.toLowerCase().includes(query))
                    );

                    const totalAddonPages = Math.max(1, Math.ceil(filteredAddOns.length / ADDON_PAGE_SIZE));
                    const paginatedAddOns = filteredAddOns.slice(
                      (addonPage - 1) * ADDON_PAGE_SIZE,
                      addonPage * ADDON_PAGE_SIZE
                    );

                    const selectedMain = allMain.find(s => selectedServiceIds.includes(s.serviceId)) || null;
                    const isPremiumSelected = (selectedMain?.servicePackageType ?? 0) === 3;

                    const selectMainPackage = (svc: BranchService) => {
                      setSelectedServiceIds(prev => {
                        const keptAddOns = (svc.servicePackageType ?? 1) === 3
                          ? []
                          : prev.filter(id => allAddOns.some(a => a.serviceId === id));
                        return [svc.serviceId, ...keptAddOns];
                      });
                    };

                    const toggleAddOn = (svc: BranchService) => {
                      if (isPremiumSelected) return;
                      setSelectedServiceIds(prev =>
                        prev.includes(svc.serviceId)
                          ? prev.filter(id => id !== svc.serviceId)
                          : [...prev, svc.serviceId]
                      );
                    };

                    return (
                      <>
                        {/* Main Service Section */}
                        <section style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1.5px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              Gói Dịch Vụ Chính <span style={{ fontWeight: 400, fontSize: '0.9rem', color: '#64748b' }}>({mainPackages.length} gói)</span>
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>Chọn một gói dịch vụ chính</p>
                          </div>

                          {mainPackages.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                              {query ? 'Không tìm thấy gói chính phù hợp từ khóa.' : 'Chi nhánh này chưa có gói dịch vụ chính nào phù hợp với loại xe của bạn.'}
                            </p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                              {mainPackages.map(s => {
                                const isSelected = selectedServiceIds.includes(s.serviceId);
                                return (
                                  <div
                                    key={s.serviceId}
                                    onClick={() => selectMainPackage(s)}
                                    style={{
                                      position: 'relative',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      padding: '16px',
                                      borderRadius: '14px',
                                      cursor: 'pointer',
                                      border: isSelected ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                                      background: isSelected ? '#eff6ff' : '#ffffff',
                                      boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    {/* Radio indicator */}
                                    <div style={{ position: 'absolute', right: '14px', top: '14px', color: isSelected ? '#0284c7' : '#cbd5e1' }}>
                                      <span style={{ fontSize: '1.2rem' }}>{isSelected ? '🔘' : '⚪'}</span>
                                    </div>

                                    <div style={{ paddingRight: '28px', marginBottom: '8px' }}>
                                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.serviceName}</h4>
                                    </div>

                                    {/* Badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                      {s.vehicleType && (
                                        <span style={{
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          background: s.vehicleType === 1 ? 'rgba(59, 130, 246, 0.12)' :
                                                     s.vehicleType === 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                          color: s.vehicleType === 1 ? '#2563eb' :
                                                 s.vehicleType === 2 ? '#059669' : '#d97706',
                                          border: '1px solid currentColor'
                                        }}>
                                          {s.vehicleType === 1 ? '🏍️ XE MÁY' : s.vehicleType === 2 ? '🚗 Ô TÔ' : '🚚 XE TẢI'}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        padding: '3px 8px',
                                        borderRadius: '20px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0'
                                      }}>
                                        ⏱️ {s.durationMinutes} phút
                                      </span>
                                      {(s.servicePackageType ?? 1) === 3 && (
                                        <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '20px' }}>
                                          Trọn gói
                                        </span>
                                      )}
                                    </div>

                                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 14px', flex: 1 }}>
                                      {s.description || 'Gói dịch vụ tiêu chuẩn chuyên nghiệp.'}
                                    </p>

                                    <div style={{ marginTop: 'auto', textAlign: 'right', fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>
                                      {formatVND(s.basePrice)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>

                        {/* Add-on Service Section */}
                        <section style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1.5px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              Dịch Vụ Bổ Sung (Add-ons) <span style={{ fontWeight: 400, fontSize: '0.9rem', color: '#64748b' }}>({filteredAddOns.length} dịch vụ)</span>
                            </h2>
                          </div>

                          {isPremiumSelected ? (
                            <div className="confirm-modal-warning" style={{ fontSize: '0.85rem' }}>
                              Gói trọn gói đã bao gồm toàn bộ dịch vụ bổ sung, bạn không cần chọn thêm.
                            </div>
                          ) : filteredAddOns.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                              {query ? 'Không tìm thấy dịch vụ bổ sung phù hợp từ khóa.' : 'Chi nhánh này chưa có dịch vụ bổ sung nào.'}
                            </p>
                          ) : (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {paginatedAddOns.map(s => {
                                  const isSelected = selectedServiceIds.includes(s.serviceId);
                                  return (
                                    <div
                                      key={s.serviceId}
                                      onClick={() => selectedMain && toggleAddOn(s)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: isSelected ? '1.5px solid #0284c7' : '1.5px solid #e2e8f0',
                                        background: isSelected ? '#eff6ff' : '#ffffff',
                                        cursor: selectedMain ? 'pointer' : 'not-allowed',
                                        opacity: selectedMain ? 1 : 0.6,
                                        transition: 'all 0.18s ease',
                                      }}
                                    >
                                      {/* Checkbox */}
                                      <div style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '6px',
                                        border: isSelected ? '2px solid #0284c7' : '2px solid #cbd5e1',
                                        background: isSelected ? '#0284c7' : '#ffffff',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '14px',
                                        flexShrink: 0,
                                        fontSize: '0.8rem',
                                        fontWeight: 800
                                      }}>
                                        {isSelected && '✓'}
                                      </div>

                                      <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{s.serviceName}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                                          <span>⏱️ +{s.durationMinutes} phút</span>
                                        </div>
                                      </div>

                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0284c7' }}>
                                        +{formatVND(s.basePrice)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Add-ons Pagination */}
                              {filteredAddOns.length > ADDON_PAGE_SIZE && (
                                <div style={{ marginTop: '16px' }}>
                                  <Pagination
                                    currentPage={addonPage}
                                    totalPages={totalAddonPages}
                                    totalCount={filteredAddOns.length}
                                    itemName="dịch vụ bổ sung"
                                    onPageChange={setAddonPage}
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {!selectedMain && allAddOns.length > 0 && !isPremiumSelected && (
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '10px' }}>
                              💡 Vui lòng chọn một gói dịch vụ chính trước khi thêm dịch vụ bổ sung.
                            </p>
                          )}
                        </section>
                      </>
                    );
                  })()}
                </div>

                {/* Right Column (Appointment Panel - Sticky) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px', zIndex: 10 }}>
                  {/* Card 1: Khung giờ hẹn */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#f8fafc',
                      padding: '14px 18px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#0f172a'
                    }}>
                      📅 Khung giờ hẹn
                    </div>

                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {/* Date Picker */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                          CHỌN NGÀY HẸN
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          value={selectedDate}
                          onChange={e => setSelectedDate(e.target.value)}
                          min={getLocalDateString()}
                          style={{ width: '100%', fontSize: '0.95rem', borderRadius: '10px', padding: '10px 14px' }}
                        />
                      </div>

                      {/* Time Slots */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                          KHUNG GIỜ CÒN TRỐNG
                        </label>
                        {slots.length === 0 ? (
                          <div
                            style={{
                              padding: '16px',
                              background: '#f8fafc',
                              borderRadius: '10px',
                              textAlign: 'center',
                              fontSize: '0.88rem',
                              color: '#64748b',
                              border: '1px dashed #cbd5e1'
                            }}
                          >
                            Không có khung giờ trống trong ngày này. Vui lòng chọn ngày khác.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                            {slots.map(slot => {
                              const isSelected = selectedSlotId === slot.slotInventoryId;
                              const isFull = slot.availableCount <= 0;
                              const isPast = isSlotInPast(slot.slotDate, slot.slotStartTime);
                              const isDisable = isFull || isPast;
                              return (
                                <button
                                  key={slot.slotInventoryId}
                                  type="button"
                                  disabled={isDisable}
                                  onClick={() => !isDisable && setSelectedSlotId(slot.slotInventoryId)}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px 8px',
                                    borderRadius: '10px',
                                    cursor: isDisable ? 'not-allowed' : 'pointer',
                                    border: isSelected ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                                    background: isSelected ? '#eff6ff' : isDisable ? '#f8fafc' : '#ffffff',
                                    color: isSelected ? '#0284c7' : isDisable ? '#94a3b8' : '#0f172a',
                                    opacity: isDisable ? 0.5 : 1,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span style={{ fontSize: '0.95rem', fontWeight: 700, textDecoration: isDisable ? 'line-through' : 'none' }}>
                                    {slot.slotStartTime ? slot.slotStartTime.substring(0, 5) : '00:00'}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', marginTop: '2px', color: isDisable ? '#ef4444' : isSelected ? '#0284c7' : '#16a34a', fontWeight: 500 }}>
                                    {isPast
                                      ? 'Đã qua'
                                      : isFull
                                        ? 'Đã đầy'
                                        : `Còn ${slot.availableCount} chỗ`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Tóm tắt đặt lịch */}
                  {(() => {
                    const allMain = services.filter(s => (s.servicePackageType ?? 1) !== 2);
                    const allAddOns = services.filter(s => (s.servicePackageType ?? 1) === 2);
                    const selectedMain = allMain.find(s => selectedServiceIds.includes(s.serviceId)) || null;
                    const selectedAddOns = allAddOns.filter(s => selectedServiceIds.includes(s.serviceId));
                    const selectedServices = services.filter(s => selectedServiceIds.includes(s.serviceId));
                    const estimatedMinutes = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                    const estimatedPrice = selectedServices.reduce((sum, s) => sum + (s.basePrice || 0), 0);

                    return (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1.5px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        padding: '18px'
                      }}>
                        <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 14px' }}>
                          TÓM TẮT ĐẶT LỊCH
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#64748b' }}>Dịch vụ chính:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                              {selectedMain ? `${selectedMain.serviceName} (${formatVND(selectedMain.basePrice)})` : 'Chưa chọn'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#64748b' }}>Dịch vụ bổ sung:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                              {selectedAddOns.length > 0 ? `${selectedAddOns.length} dịch vụ` : '0 dịch vụ'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#64748b' }}>Thời gian dự kiến:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                              {estimatedMinutes > 0 ? `${estimatedMinutes} phút` : '0 phút'}
                            </span>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>Tạm tính:</span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>
                            {formatVND(estimatedPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setWizardStep(2)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: '#ffffff'
                      }}
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        !services.some(
                          s => selectedServiceIds.includes(s.serviceId) && (s.servicePackageType ?? 1) !== 2
                        ) || !selectedSlotId
                      }
                      onClick={() => setWizardStep(4)}
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      Tiếp tục →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: QUOTE PREVIEW & CONFIRM */}
          {wizardStep === 4 && (
            <div>
              <h3>Bước 4: Báo giá &amp; Xác nhận</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Vui lòng kiểm tra lại thông tin chi tiết và xác nhận đặt lịch bên dưới.
              </p>

              {quoteLoading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Đang tính toán chi tiết báo giá...</p>
              ) : !quote ? (
                <p className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>
                  Không thể tính báo giá. Vui lòng quay lại và thử lại.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Detailed receipt */}
                  <div className="quote-summary-card">
                    <h4
                      style={{
                        borderBottom: '1px solid var(--color-border-dim)',
                        paddingBottom: '8px',
                        marginBottom: '14px',
                      }}
                    >
                      Chi tiết hóa đơn
                    </h4>
                    <div className="quote-row">
                      <span>Tiền dịch vụ gốc</span>
                      <strong>{formatVND(quote.serviceSubtotal ?? quote.subtotal)}</strong>
                    </div>
                    {quote.vehicleSurchargeAmount > 0 && (
                      <div className="quote-row">
                        <span>Phụ thu xe ({quote.vehicleCondition === 'New' ? 'Xe mới +10%' : quote.vehicleCondition === 'Old' ? 'Xe cũ +15%' : 'Tiêu chuẩn'})</span>
                        <strong>+{formatVND(quote.vehicleSurchargeAmount)}</strong>
                      </div>
                    )}
                    {quote.vehicleSurchargeAmount > 0 && (
                      <div className="quote-row" style={{ borderTop: '1px dashed var(--color-border-dim)', paddingTop: '6px' }}>
                        <span>Tổng cộng tạm tính</span>
                        <strong>{formatVND(quote.subtotal)}</strong>
                      </div>
                    )}
                    {quote.discountAmount > 0 && (
                      <div className="quote-row" style={{ color: 'var(--color-success)' }}>
                        <span>Giảm giá / Ưu đãi</span>
                        <strong>-{formatVND(quote.discountAmount)}</strong>
                      </div>
                    )}
                    <div className="quote-row">
                      <span>Thời gian ước tính</span>
                      <strong>{quote.totalDurationMinutes} phút</strong>
                    </div>
                    <div className="quote-row quote-total" style={{ borderTop: '2px solid var(--color-primary)', paddingTop: '10px' }}>
                      <span>Tổng tiền thanh toán</span>
                      <strong>{formatVND(quote.finalAmount)}</strong>
                    </div>
                  </div>

                  {/* Summary recap details */}
                  <div
                    className="quote-summary-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                  >
                    <h4
                      style={{
                        borderBottom: '1px solid var(--color-border-dim)',
                        paddingBottom: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      Tóm tắt đặt lịch
                    </h4>
                    <div>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                          marginBottom: '2px',
                        }}
                      >
                        Chi nhánh đã chọn
                      </p>
                      <p style={{ fontWeight: 600 }}>
                        {branches.find(b => b.branchId === selectedBranchId)?.name ||
                          'Chi nhánh đã chọn'}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                          marginBottom: '2px',
                        }}
                      >
                        Ngày &amp; Giờ hẹn
                      </p>
                      <p style={{ fontWeight: 600 }}>
                        {selectedDate} lúc{' '}
                        {slots
                          .find(s => s.slotInventoryId === selectedSlotId)
                          ?.slotStartTime?.substring(0, 5) || 'Chưa chọn giờ'}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                          marginBottom: '4px',
                        }}
                      >
                        Phương tiện
                      </p>
                      {(() => {
                        const curVeh = vehicles.find(v => (v.VehicleId || v.vehicleId) === selectedVehicleId);
                        const curImg = curVeh?.PrimaryImageUrl || curVeh?.primaryImageUrl || '';
                        const curPlate = curVeh?.LicensePlate || curVeh?.licensePlate || 'Xe đã chọn';
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {curImg ? (
                              <img
                                src={curImg}
                                alt={curPlate}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid var(--color-border-dim)',
                                }}
                              />
                            ) : (
                              <span>🚘</span>
                            )}
                            <span style={{ fontWeight: 600 }}>{curPlate}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Voucher Section */}
              {!quoteLoading && quote && (
                <div
                  style={{
                    marginTop: '24px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--color-border-dim)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <h4
                    style={{
                      color: 'var(--color-heading)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🎟️</span> Áp dụng Mã giảm giá / Voucher
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '20px',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Select from owned vouchers dropdown */}
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>
                        Chọn từ Voucher của bạn
                      </label>
                      <select
                        className="form-input form-select-custom"
                        value={selectedUserVoucherId}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedUserVoucherId(val);
                          setSelectedVoucherCode(''); // Clear manual code
                          setVoucherError(null);
                          if (val) {
                            const found = myAvailableVouchers.find(v => v.userVoucherId === val);
                            setVoucherCodeInput(found ? found.voucherCode : '');
                          } else {
                            setVoucherCodeInput('');
                          }
                        }}
                      >
                        <option value="">-- Không sử dụng voucher --</option>
                        {myAvailableVouchers.map(v => (
                          <option key={v.userVoucherId} value={v.userVoucherId}>
                            {v.voucherCode} (Giảm{' '}
                            {v.discountType === 1
                              ? `${v.discountValue}%`
                              : `${v.discountValue.toLocaleString()}đ`}
                            {v.minOrderAmount
                              ? ` - Đơn từ ${v.minOrderAmount.toLocaleString()}đ`
                              : ''}
                            )
                          </option>
                        ))}
                      </select>
                      {myAvailableVouchers.length === 0 && (
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '6px',
                          }}
                        >
                          Bạn không có voucher chưa sử dụng nào hợp lệ cho chi nhánh này.
                        </p>
                      )}
                    </div>

                    {/* Type code manually */}
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>
                        Hoặc nhập mã code
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="VD: WELCOME20"
                          value={voucherCodeInput}
                          onChange={e => {
                            setVoucherCodeInput(e.target.value.toUpperCase());
                            setVoucherError(null);
                          }}
                        />
                        <AnimatedButton
                          type="button"
                          variant="secondary"
                          onClick={handleApplyVoucherCode}
                        >
                          Áp dụng
                        </AnimatedButton>
                      </div>
                      {voucherError && (
                        <p
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--color-danger)',
                            marginTop: '4px',
                          }}
                        >
                          {voucherError}
                        </p>
                      )}
                    </div>
                  </div>

                  {(selectedUserVoucherId || selectedVoucherCode) && (
                    <div
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(99, 102, 241, 0.08)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Đã áp dụng voucher:{' '}
                        <strong style={{ color: 'var(--color-heading)' }}>
                          {selectedUserVoucherId
                            ? myAvailableVouchers.find(
                              v => v.userVoucherId === selectedUserVoucherId
                            )?.voucherCode
                            : selectedVoucherCode}
                        </strong>
                      </span>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          textDecoration: 'underline',
                        }}
                        onClick={() => {
                          setSelectedUserVoucherId('');
                          setSelectedVoucherCode('');
                          setVoucherCodeInput('');
                          setVoucherError(null);
                        }}
                      >
                        Hủy áp dụng
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Loyalty Points Section */}
              {!quoteLoading && quote && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--color-border-dim)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <h4
                    style={{
                      color: 'var(--color-heading)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>💎</span> Đổi điểm tích lũy thành tiền hóa
                    đơn
                  </h4>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '16px',
                    }}
                  >
                    Bạn đang có:{' '}
                    <strong style={{ color: 'var(--color-heading)' }}>
                      {userPoints.toLocaleString()}
                    </strong>{' '}
                    điểm tích lũy (tương đương với{' '}
                    <strong style={{ color: 'var(--color-heading)' }}>
                      {userPoints.toLocaleString()}đ
                    </strong>
                    ).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="redeemMode"
                        checked={redeemMode === 0}
                        onChange={() => handleRedeemModeChange(0)}
                      />
                      <span>Không sử dụng điểm</span>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="redeemMode"
                        disabled={userPoints <= 0}
                        checked={redeemMode === 1}
                        onChange={() => handleRedeemModeChange(1)}
                      />
                      <span>Đổi toàn bộ điểm khả dụng ({userPoints.toLocaleString()} điểm)</span>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="redeemMode"
                        disabled={userPoints < 1000}
                        checked={redeemMode === 2}
                        onChange={() => handleRedeemModeChange(2)}
                      />
                      <span>Đổi số điểm tùy chọn (Tối thiểu 1,000 điểm)</span>
                    </label>
                  </div>

                  {redeemMode === 2 && (
                    <div style={{ marginTop: '16px', maxWidth: '400px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>
                        Nhập số điểm cần quy đổi:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="VD: 5000"
                          min="1000"
                          max={userPoints}
                          value={customRedeemInput}
                          onChange={e => {
                            setCustomRedeemInput(e.target.value);
                            setRedeemError(null);
                          }}
                        />
                        <AnimatedButton
                          type="button"
                          variant="secondary"
                          onClick={handleApplyRedeemPoints}
                        >
                          Áp dụng điểm
                        </AnimatedButton>
                      </div>
                      {redeemError && (
                        <p
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--color-danger)',
                            marginTop: '4px',
                          }}
                        >
                          {redeemError}
                        </p>
                      )}
                    </div>
                  )}

                  {redeemMode > 0 && redeemPoints > 0 && !redeemError && (
                    <div
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-success)',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Sẽ quy đổi:{' '}
                        <strong style={{ color: 'var(--color-heading)' }}>
                          {redeemPoints.toLocaleString()}
                        </strong>{' '}
                        điểm (giảm -{formatVND(redeemPoints)})
                      </span>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          textDecoration: 'underline',
                        }}
                        onClick={() => handleRedeemModeChange(0)}
                      >
                        Hủy áp dụng
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '30px',
                  borderTop: '1px solid var(--color-border-dim)',
                  paddingTop: '20px',
                }}
              >
                <AnimatedButton type="button" variant="ghost" onClick={() => setWizardStep(3)} showArrow={false}>
                  ← Quay lại
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={submitLoading || !quote}
                  onClick={handleConfirmBooking}
                >
                  {submitLoading ? 'Đang tạo lịch hẹn...' : 'Xác nhận & Đặt lịch ngay'}
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING SUCCESSFUL + PAYMENT LINKS */}
          {wizardStep === 5 && newBooking && (
            <div className="booking-success-card">
              <div className="success-icon-wrap">✓</div>
              <h2>Đặt lịch thành công!</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: '460px' }}>
                Cảm ơn bạn đã lựa chọn AutoWashPro. Lịch hẹn của bạn đã được tiếp nhận và xử lý.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '28px',
                  justifyContent: 'center',
                  marginTop: '10px',
                }}
              >
                {/* QR Code and basic check-in instructions */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div className="qr-code-box">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(newBooking.checkInQrCode || newBooking.bookingCode)}`}
                      alt="Check-in QR Code"
                      width="180"
                      height="180"
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Mã Check-in: <strong>{newBooking.bookingCode}</strong>
                  </span>
                </div>

                {/* Recap summary list */}
                <div
                  style={{
                    textAlign: 'left',
                    minWidth: '240px',
                    background: 'rgba(255,255,255,0.015)',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-dim)',
                  }}
                >
                  <h4
                    style={{
                      marginBottom: '12px',
                      borderBottom: '1px solid var(--color-border-dim)',
                      paddingBottom: '6px',
                    }}
                  >
                    Tóm tắt đặt lịch
                  </h4>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    📅 <strong>Ngày:</strong> {newBooking.slotDate}
                  </p>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    🕒 <strong>Giờ:</strong>{' '}
                    {newBooking.slotStartTime ? newBooking.slotStartTime.substring(0, 5) : '00:00'}
                  </p>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    🚘 <strong>Biển số xe:</strong> {newBooking.licensePlate}
                  </p>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    💵 <strong>Tiền dịch vụ gốc:</strong> {formatVND(newBooking.serviceSubtotal ?? newBooking.bookingSubtotal)}
                  </p>
                  {(newBooking.vehicleSurchargeAmount ?? 0) > 0 && (
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                      ⚡ <strong>Phụ thu xe ({newBooking.vehicleConditionAtBooking === 'New' ? 'Xe mới +10%' : newBooking.vehicleConditionAtBooking === 'Old' ? 'Xe cũ +15%' : 'Tiêu chuẩn'}):</strong> +{formatVND(newBooking.vehicleSurchargeAmount)}
                    </p>
                  )}
                  {(newBooking.vehicleSurchargeAmount ?? 0) > 0 && (
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                      💵 <strong>Tổng cộng tạm tính:</strong> {formatVND(newBooking.bookingSubtotal)}
                    </p>
                  )}
                  {newBooking.bookingDiscountAmount > 0 && (
                    <p
                      style={{ margin: '6px 0', fontSize: '0.9rem', color: 'var(--color-success)' }}
                    >
                      🎁 <strong>Giảm giá:</strong> -{formatVND(newBooking.bookingDiscountAmount)}
                    </p>
                  )}
                  {newBooking.redeemedPoints > 0 && (
                    <p
                      style={{ margin: '6px 0', fontSize: '0.9rem', color: 'var(--color-success)' }}
                    >
                      💎 <strong>Đã dùng:</strong> {newBooking.redeemedPoints.toLocaleString()} điểm
                    </p>
                  )}
                  <p
                    style={{
                      margin: '6px 0',
                      fontSize: '0.9rem',
                      borderTop: '1px dashed var(--color-border-dim)',
                      paddingTop: '6px',
                      marginTop: '6px',
                    }}
                  >
                    💰 <strong>Tổng tiền thanh toán:</strong> {formatVND(newBooking.bookingFinalAmount)}
                  </p>
                </div>
              </div>

              {/* Online Payment prompts */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '580px',
                  marginTop: '10px',
                }}
              >
                <h4 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
                  💳 Đặt cọc / Thanh toán trực tuyến qua VNPay
                </h4>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                    lineHeight: '1.4',
                  }}
                >
                  Để đảm bảo giữ chỗ và làm thủ tục nhanh chóng khi đến chi nhánh, bạn có thể thanh toán cọc 50% hoặc thanh toán toàn bộ 100% qua cổng VNPay.
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <AnimatedButton
                    type="button"
                    variant="primary"
                    onClick={() => handlePaymentRedirect(newBooking.bookingId, false)}
                  >
                    Đặt cọc 50% ({formatVND(newBooking.bookingFinalAmount / 2)})
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    variant="secondary"
                    onClick={() => handlePaymentRedirect(newBooking.bookingId, true)}
                  >
                    Thanh toán 100% ({formatVND(newBooking.bookingFinalAmount)})
                  </AnimatedButton>
                </div>
              </div>

              <AnimatedButton
                type="button"
                variant="ghost"
                style={{ marginTop: '20px' }}
                onClick={() => setViewMode('list')}
              >
                Quay lại danh sách lịch hẹn
              </AnimatedButton>
            </div>
          )}
        </div>
      )}

      {/* VIEW BOOKING DETAILS MODAL */}
      {showDetailsModal && selectedBooking && (
        <div className="booking-modal-overlay">
          <div className="booking-modal-card">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowDetailsModal(false)}
            >
              ✕
            </button>

            <div className="booking-detail-header-block">
              <h3>Mã đơn: {selectedBooking.bookingCode}</h3>
              <StatusBadge
                type={getStatusClass(selectedBooking.bookingStatus)}
                label={getStatusLabel(selectedBooking.bookingStatus)}
              />
            </div>

            <div className="booking-detail-body">
              {/* Booking Progress Tracker (Stepper) */}
              {(() => {
                const status = selectedBooking.bookingStatus;
                if (status === 7 || status === 8) {
                  return (
                    <div className="booking-progress-tracker cancelled">
                      <div
                        className="progress-message-banner"
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <p
                          className="progress-message-text"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <span>❌</span>{' '}
                          {status === 7
                            ? 'Lịch hẹn này đã bị hủy.'
                            : 'Khách không đến đúng giờ hẹn (No Show).'}
                        </p>
                      </div>
                    </div>
                  );
                }

                // Steps:
                // 1: Pending (1) / Confirmed (2) -> Đã xác nhận
                // 2: Checked In (3) -> Đã đến
                // 3: In Progress (4) -> Đang rửa xe
                // 4: Completed (5) / Closed (6) -> Hoàn thành
                let currentStep = 1;
                let progressPercent = 0;
                let stepMessage =
                  'Đơn đặt của bạn đã được ghi nhận. Vui lòng thanh toán đặt cọc để xác nhận lịch hẹn.';

                if (status === 3) {
                  currentStep = 2;
                  progressPercent = 33;
                  stepMessage = selectedBooking.assignedStaffName
                    ? `Bạn đã check-in thành công. Nhân viên ${selectedBooking.assignedStaffName} đang chuẩn bị rửa xe cho bạn.`
                    : 'Bạn đã check-in thành công. Xe đang chờ để đưa vào khu vực rửa.';
                } else if (status === 4) {
                  currentStep = 3;
                  progressPercent = 66;
                  stepMessage = selectedBooking.assignedStaffName
                    ? `Nhân viên ${selectedBooking.assignedStaffName} đang rửa xe của bạn. Vui lòng thư giãn tại phòng chờ!`
                    : 'Nhân viên đang rửa xe của bạn. Vui lòng thư giãn tại phòng chờ!';
                } else if (status >= 5) {
                  currentStep = 4;
                  progressPercent = 100;
                  stepMessage = selectedBooking.assignedStaffName
                    ? `Nhân viên ${selectedBooking.assignedStaffName} đã rửa xe xong sạch bóng! Bạn có thể nhận xe và thanh toán phần còn lại.`
                    : 'Xe đã được rửa xong sạch bóng! Bạn có thể nhận xe và thanh toán phần còn lại.';
                } else if (status === 2) {
                  currentStep = 1;
                  progressPercent = 0;
                  stepMessage =
                    'Đơn đặt lịch đã được xác nhận & thanh toán cọc. Chúng tôi chờ bạn!';
                }

                return (
                  <div className="booking-progress-tracker">
                    <div className="progress-bar-container">
                      <div className="progress-bar-line" style={{ width: `${progressPercent}%` }} />
                      <div className="progress-steps">
                        <div
                          className={`progress-step-item ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}
                        >
                          <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
                          <span className="step-label">
                            {status === 1 ? 'Chờ cọc' : 'Đã xác nhận'}
                          </span>
                        </div>
                        <div
                          className={`progress-step-item ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}
                        >
                          <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
                          <span className="step-label">Đã đến</span>
                        </div>
                        <div
                          className={`progress-step-item ${currentStep >= 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}
                        >
                          <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
                          <span className="step-label">Đang rửa xe</span>
                        </div>
                        <div
                          className={`progress-step-item ${currentStep >= 4 ? 'completed' : ''} ${currentStep === 4 ? 'active' : ''}`}
                        >
                          <div className="step-circle">{currentStep > 4 ? '✓' : '4'}</div>
                          <span className="step-label">Hoàn thành</span>
                        </div>
                      </div>
                    </div>
                    <div className="progress-message-banner">
                      <p className="progress-message-text">
                        {status === 4 && (
                          <span className="animate-spin" style={{ display: 'inline-block' }}>
                            🧼
                          </span>
                        )}
                        {status === 3 && <span>📍</span>}
                        {status === 2 && <span>✓</span>}
                        {status >= 5 && <span>✨</span>}
                        {stepMessage}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Info grid */}
              <div className="booking-detail-grid">
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Ngày hẹn</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.slotDate || 'Chưa lên lịch'}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Khung giờ hẹn</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.slotStartTime
                      ? selectedBooking.slotStartTime.substring(0, 5)
                      : 'Chưa có khung giờ'}
                    {selectedBooking.slotEndTime
                      ? ` - ${selectedBooking.slotEndTime.substring(0, 5)}`
                      : ''}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Phương tiện</span>
                  <span className="booking-detail-item-value">
                    🚘 {selectedBooking.licensePlate || 'Không có'} (
                    {selectedBooking.vehicleBrand || 'Chưa rõ hãng'})
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Loại phương tiện</span>
                  <span className="booking-detail-item-value">
                    {getVehicleLabel(selectedBooking.vehicleType)}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Điểm tích lũy nhận được</span>
                  <span className="booking-detail-item-value">
                    +{selectedBooking.earnedPoints || 0} điểm
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Thời gian tạo đơn</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.createdAtUtc
                      ? new Date(selectedBooking.createdAtUtc).toLocaleDateString('vi-VN')
                      : 'Không rõ'}
                  </span>
                </div>
                {selectedBooking.assignedStaffName && (
                  <div className="booking-detail-item">
                    <span className="booking-detail-item-label">Nhân viên thực hiện</span>
                    <span
                      className="booking-detail-item-value"
                      style={{ color: 'var(--color-cyan)' }}
                    >
                      👤 {selectedBooking.assignedStaffName}
                    </span>
                  </div>
                )}
              </div>

              {/* Service list items */}
              <div className="booking-detail-services-box">
                <div className="booking-detail-services-title">Danh sách dịch vụ</div>
                {selectedBooking.lines && selectedBooking.lines.length > 0 ? (
                  selectedBooking.lines.map(line => (
                    <div key={line.bookingLineId} className="booking-detail-service-line">
                      <span>
                        {line.serviceName} x{line.quantity}
                      </span>
                      <span className="booking-detail-service-price">
                        {formatVND(line.lineTotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="booking-detail-service-line">
                    <span>Không tìm thấy dịch vụ nào.</span>
                  </div>
                )}

                {/* Checkout pricing recap */}
                <div
                  style={{
                    marginTop: '12px',
                    borderTop: '1px dashed var(--color-border-dim)',
                    paddingTop: '10px',
                  }}
                >
                  <div
                    className="booking-detail-service-line"
                    style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
                  >
                    <span>Tiền dịch vụ gốc</span>
                    <span>{formatVND(selectedBooking.serviceSubtotal ?? selectedBooking.bookingSubtotal)}</span>
                  </div>
                  {(selectedBooking.vehicleSurchargeAmount ?? 0) > 0 && (
                    <div
                      className="booking-detail-service-line"
                      style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
                    >
                      <span>Phụ thu xe ({selectedBooking.vehicleConditionAtBooking === 'New' ? 'Xe mới +10%' : selectedBooking.vehicleConditionAtBooking === 'Old' ? 'Xe cũ +15%' : 'Tiêu chuẩn'})</span>
                      <span>+{formatVND(selectedBooking.vehicleSurchargeAmount)}</span>
                    </div>
                  )}
                  {(selectedBooking.vehicleSurchargeAmount ?? 0) > 0 && (
                    <div
                      className="booking-detail-service-line"
                      style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', borderTop: '1px dashed var(--color-border-dim)', paddingTop: '4px' }}
                    >
                      <span>Tổng cộng tạm tính</span>
                      <span>{formatVND(selectedBooking.bookingSubtotal)}</span>
                    </div>
                  )}
                  {selectedBooking.bookingDiscountAmount > 0 && (
                    <div
                      className="booking-detail-service-line"
                      style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}
                    >
                      <span>Tổng giảm giá</span>
                      <span>-{formatVND(selectedBooking.bookingDiscountAmount)}</span>
                    </div>
                  )}
                  {selectedBooking.redeemedPoints > 0 && (
                    <div
                      className="booking-detail-service-line"
                      style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}
                    >
                      <span>Điểm quy đổi</span>
                      <span>-{selectedBooking.redeemedPoints.toLocaleString()} điểm</span>
                    </div>
                  )}
                  <div
                    className="booking-detail-service-line"
                    style={{
                      fontWeight: 'bold',
                      fontSize: '1.0rem',
                      color: 'var(--color-heading)',
                      marginTop: '4px',
                    }}
                  >
                    <span>Tổng tiền</span>
                    <span>{formatVND(selectedBooking.bookingFinalAmount)}</span>
                  </div>
                  {selectedBooking.depositAmount && selectedBooking.depositAmount > 0 ? (
                    <>
                      <div
                        className="booking-detail-service-line"
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-text-muted)',
                          borderTop: '1px dashed var(--color-border-dim)',
                          paddingTop: '6px',
                          marginTop: '6px',
                        }}
                      >
                        <span>Đã cọc trực tuyến</span>
                        <span>-{formatVND(selectedBooking.depositAmount)}</span>
                      </div>
                      <div
                        className="booking-detail-service-line"
                        style={{
                          fontWeight: 'bold',
                          fontSize: '1.05rem',
                          color: 'var(--color-primary)',
                          marginTop: '4px',
                        }}
                      >
                        <span>Số tiền còn lại thanh toán tại quầy</span>
                        <span>
                          {formatVND(
                            selectedBooking.bookingFinalAmount - selectedBooking.depositAmount
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div
                      className="booking-detail-service-line"
                      style={{
                        fontWeight: 'bold',
                        fontSize: '1.05rem',
                        color: 'var(--color-heading)',
                        marginTop: '4px',
                      }}
                    >
                      <span>Tổng tiền cần thanh toán</span>
                      <span>{formatVND(selectedBooking.bookingFinalAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review section */}
              {(selectedBooking.bookingStatus === 5 || selectedBooking.bookingStatus === 6) && (
                <div
                  style={{
                    marginTop: '16px',
                    borderTop: '1px solid var(--color-border-dim)',
                    paddingTop: '16px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '1.0rem',
                      marginBottom: '8px',
                      color: 'var(--color-heading)',
                    }}
                  >
                    Đánh giá dịch vụ
                  </div>
                  {(() => {
                    const review = userReviews.find(
                      r => r.bookingId === selectedBooking.bookingId && r.reviewType === 1
                    );
                    if (review) {
                      return (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--color-border-dim)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: '4px',
                              fontSize: '1.1rem',
                              color: '#ffb229',
                              marginBottom: '6px',
                            }}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                            ))}
                          </div>
                          {review.comment ? (
                            <p
                              style={{
                                margin: 0,
                                fontStyle: 'italic',
                                fontSize: '0.9rem',
                                color: 'var(--color-text)',
                              }}
                            >
                              "{review.comment}"
                            </p>
                          ) : (
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.9rem',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              Không có nhận xét.
                            </p>
                          )}
                          {review.isHidden && (
                            <span
                              className="badge badge-danger"
                              style={{ marginTop: '8px', display: 'inline-block' }}
                            >
                              Đánh giá này đã bị ẩn bởi ban quản lý
                            </span>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div>
                          <p
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--color-text-muted)',
                              marginBottom: '10px',
                            }}
                          >
                            Bạn chưa đánh giá lịch hẹn này. Hãy chia sẻ trải nghiệm với chúng tôi nhé!
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleOpenReviewModal(selectedBooking);
                            }}
                          >
                            Viết đánh giá
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* QR check-in code */}
              {(selectedBooking.bookingStatus === 1 || selectedBooking.bookingStatus === 2) && (
                <div className="booking-detail-qr-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(selectedBooking.checkInQrCode || selectedBooking.bookingCode)}`}
                    alt="Booking QR Code"
                    width="140"
                    height="140"
                  />
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-text-muted)',
                      lineHeight: '1.4',
                      maxWidth: '340px',
                    }}
                  >
                    Xuất trình mã QR này hoặc Mã đơn cho nhân viên tại quầy chi nhánh để làm thủ tục nhận xe.
                  </p>
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="booking-detail-actions">
              {selectedBooking.bookingStatus === 1 && (
                <AnimatedButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handlePaymentRedirect(selectedBooking.bookingId, false)}
                >
                  Thanh toán cọc (50%)
                </AnimatedButton>
              )}
              {(selectedBooking.bookingStatus === 1 || selectedBooking.bookingStatus === 2) && (
                <AnimatedButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelBookingClick(selectedBooking)}
                >
                  Hủy lịch hẹn
                </AnimatedButton>
              )}
              <AnimatedButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
              >
                Đóng
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCancelConfirm && !!bookingToCancel}
        title="Hủy lịch hẹn"
        variant="danger"
        onCancel={() => {
          setShowCancelConfirm(false);
          setBookingToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        confirmText="Xác nhận hủy lịch"
        cancelText="Quay lại"
        message={
          <>
            <p>
              Bạn có chắc chắn muốn hủy lịch hẹn mã{' '}
              <span className="highlight-plate">{bookingToCancel?.bookingCode}</span>?
            </p>
            <div
              className="form-group"
              style={{ width: '100%', textAlign: 'left', marginTop: '12px' }}
            >
              <label className="form-label" htmlFor="cancel-reason-input">
                Lý do hủy lịch
              </label>
              <textarea
                id="cancel-reason-input"
                className="form-input"
                style={{ minHeight: '80px', color: 'var(--color-heading)' }}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy lịch (ví dụ: bận việc đột xuất, đổi kế hoạch...)"
                required
              />
            </div>
            {(() => {
              const estimate = estimateCancellationFee(
                bookingToCancel?.slotDate,
                bookingToCancel?.slotStartTime,
                bookingToCancel?.depositAmount ?? 0
              );
              if (!estimate) return null;
              if (estimate.isWindowClosed) {
                return (
                  <div
                    className="confirm-modal-warning"
                    style={{ fontSize: '0.82rem', marginTop: '12px' }}
                  >
                    Lịch hẹn đã tới giờ, cổng huỷ đã đóng. Vui lòng liên hệ chi nhánh để được hỗ trợ.
                  </div>
                );
              }
              const hoursText =
                estimate.hoursRemaining >= 1
                  ? `${Math.floor(estimate.hoursRemaining)} giờ ${Math.round((estimate.hoursRemaining % 1) * 60)} phút`
                  : `${Math.max(Math.round(estimate.hoursRemaining * 60), 1)} phút`;
              const paidDeposit = bookingToCancel?.depositAmount ?? 0;
              return (
                <div
                  className="confirm-modal-warning"
                  style={{ fontSize: '0.82rem', marginTop: '12px', textAlign: 'left' }}
                >
                  <div>⏳ Còn <strong>{hoursText}</strong> trước giờ hẹn.</div>
                  <div>
                    💸 Phí huỷ áp dụng: <strong>{Math.round(estimate.feeRate * 100)}%</strong>
                    {paidDeposit > 0 ? ` (-${formatVND(estimate.feeAmount)})` : ''}
                  </div>
                  {paidDeposit > 0 ? (
                    <div>
                      💰 Tiền cọc hoàn lại dự kiến: <strong>{formatVND(estimate.refundAmount)}</strong>
                      {' '}/ {formatVND(paidDeposit)}
                    </div>
                  ) : (
                    <div>💰 Đơn chưa thanh toán cọc nên không bị khấu trừ tiền.</div>
                  )}
                  <div style={{ marginTop: '6px' }}>
                    Thao tác này sẽ giải phóng khung giờ của bạn cho khách hàng khác.
                  </div>
                </div>
              );
            })()}
          </>
        }
      />

      {/* WRITE REVIEW MODAL */}
      {showReviewModal && bookingToReview && (
        <div className="booking-modal-overlay">
          <div className="booking-modal-card" style={{ maxWidth: '480px' }}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => {
                setShowReviewModal(false);
                setBookingToReview(null);
              }}
            >
              ✕
            </button>

            <h3>Đánh giá dịch vụ</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              Hãy chia sẻ trải nghiệm về đơn đặt lịch <strong>{bookingToReview.bookingCode}</strong>
              .
            </p>

            {reviewModalError && (
              <div
                className="badge badge-danger"
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {reviewModalError}
              </div>
            )}

            <form
              onSubmit={handleCreateReview}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Service Rating */}
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Chất lượng Dịch vụ (Số sao)</label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    fontSize: '2.0rem',
                    color: '#ffb229',
                    cursor: 'pointer',
                    margin: '8px 0',
                  }}
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    return (
                      <span
                        key={i}
                        onClick={() => setReviewRating(starVal)}
                        title={`${starVal} sao`}
                      >
                        {starVal <= reviewRating ? '★' : '☆'}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Nhận xét về Dịch vụ</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', color: 'var(--color-heading)', padding: '10px' }}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Nhận xét của bạn về dịch vụ rửa xe..."
                  maxLength={1000}
                />
              </div>

              {/* Staff Review Option */}
              <div
                className="form-group"
                style={{
                  textAlign: 'left',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '12px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--color-heading)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enableStaffReview}
                    onChange={e => setEnableStaffReview(e.target.checked)}
                  />
                  <span>Đánh giá nhân viên phục vụ</span>
                </label>
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    marginLeft: '22px',
                  }}
                >
                  Đánh giá này được bảo mật, chỉ Quản lý và Admin mới có thể xem.
                </p>
              </div>

              {enableStaffReview && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingLeft: '22px',
                    borderLeft: '2px solid var(--color-primary)',
                  }}
                >
                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label className="form-label">Thái độ & Hiệu suất Nhân viên</label>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        fontSize: '1.8rem',
                        color: '#ffb229',
                        cursor: 'pointer',
                        margin: '4px 0',
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starVal = i + 1;
                        return (
                          <span
                            key={i}
                            onClick={() => setStaffRating(starVal)}
                            title={`${starVal} sao`}
                          >
                            {starVal <= staffRating ? '★' : '☆'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label className="form-label">Nhận xét về Nhân viên</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '80px', color: 'var(--color-heading)', padding: '10px' }}
                      value={staffComment}
                      onChange={e => setStaffComment(e.target.value)}
                      placeholder="Góp ý về thái độ phục vụ, kỹ năng của nhân viên..."
                      maxLength={1000}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <AnimatedButton
                  type="button"
                  variant="ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowReviewModal(false);
                    setBookingToReview(null);
                  }}
                  disabled={reviewSubmitLoading}
                >
                  Hủy bỏ
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={reviewSubmitLoading}
                >
                  {reviewSubmitLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
