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

  // Dynamic pricing & booking output
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newBooking, setNewBooking] = useState<Booking | null>(null);

  // Inline Vehicle form
  const [showQuickVehicle, setShowQuickVehicle] = useState(false);
  const [quickPlate, setQuickPlate] = useState('');
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
      setErrorMsg(extractErrorMessage(err, 'Failed to load branch or vehicle information.'));
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

  // Load branch services when branch changes
  useEffect(() => {
    if (!selectedBranchId) {
      setServices([]);
      return;
    }
    const fetchServices = async () => {
      try {
        const items = await api.getBranchServices(selectedBranchId);
        const activeServices = items.filter(s => s.isActive) || [];
        setServices(activeServices);

        // Preselect service from query parameters if available
        const params = new URLSearchParams(window.location.search);
        const preselectedServiceId = params.get('serviceId');
        if (preselectedServiceId) {
          const hasService = activeServices.some(s => s.serviceId === preselectedServiceId);
          if (hasService) {
            setSelectedServiceIds([preselectedServiceId]);
          } else {
            setSelectedServiceIds([]);
          }
        } else {
          setSelectedServiceIds([]);
        }
      } catch (err) {
        setErrorMsg(extractErrorMessage(err, 'Failed to load branch services.'));
      }
    };
    fetchServices();
  }, [selectedBranchId]);

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
      const data = await api.createVehicle({
        LicensePlate: quickPlate.trim().toUpperCase(),
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
        return 'Pending Payment';
      case 2:
        return 'Confirmed';
      case 3:
        return 'Checked In';
      case 4:
        return 'In Progress';
      case 5:
        return 'Completed';
      case 6:
        return 'Closed';
      case 7:
        return 'Cancelled';
      case 8:
        return 'No Show';
      default:
        return 'Unknown';
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
    return type === 1 ? 'Motorbike' : 'Car';
  };

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') {
      // Active statuses: Pending (1), Confirmed (2), Checked In (3), In Progress (4)
      const isActive = b.bookingStatus >= 1 && b.bookingStatus <= 4;
      const isPast = b.slotDate && b.slotStartTime && isSlotInPast(b.slotDate, b.slotStartTime);
      return isActive && !isPast;
    }
    // History tab shows ALL bookings
    return true;
  });

  // Dynamic client-side total pages computation
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredBookings.length / 3));
    setTotalPages(pages);
  }, [filteredBookings.length]);

  const paginatedBookings = filteredBookings.slice((page - 1) * 3, page * 3);

  // Format currency helper
  const formatVND = (value?: number) => {
    if (value === undefined) return '0 VND';
    return new Intl.NumberFormat('en-US').format(value) + ' VND';
  };

  const handleApplyVoucherCode = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;

    setQuoteLoading(true);
    setVoucherError(null);
    try {
      const testQuote = await api.getBookingQuote({
        SlotInventoryId: selectedSlotId,
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
          <h2>Car Wash Appointments</h2>
          <p>Book your car care appointment and track your booking status.</p>
        </div>
        {viewMode === 'list' && (
          <AnimatedButton type="button" variant="primary" onClick={handleStartWizard}>
            Book New Appointment
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
              Upcoming
            </button>
            <button
              type="button"
              className={`bookings-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          <div className="booking-list">
            {loadingList ? (
              <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '40px' }}>
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="vehicle-empty card" style={{ textAlign: 'center', padding: '40px' }}>
                Không tìm thấy lịch hẹn nào. Click "Book New Appointment" để đặt lịch mới!
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
                        <h4>Booking ID: {b.bookingCode}</h4>
                        <StatusBadge
                          type={getStatusClass(b.bookingStatus)}
                          label={getStatusLabel(b.bookingStatus)}
                        />
                      </div>
                      <div className="booking-details">
                        <span>
                          <strong>Date:</strong> {b.slotDate || 'Not scheduled'}
                        </span>
                        <span>
                          <strong>Time:</strong>{' '}
                          {b.slotStartTime ? b.slotStartTime.substring(0, 5) : 'Not scheduled'}
                        </span>
                        <span>
                          <strong>Total:</strong> {formatVND(b.bookingFinalAmount)}
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
                          : 'Details'}
                      </button>
                      {b.bookingStatus === 1 && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePaymentRedirect(b.bookingId, false)}
                        >
                          Pay Deposit
                        </button>
                      )}
                      {(b.bookingStatus === 1 || b.bookingStatus === 2) && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelBookingClick(b)}
                        >
                          Cancel Booking
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
                <div className="step-label">Branch & Services</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}
              >
                <div className="step-number">2</div>
                <div className="step-label">Choose Vehicle</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}
              >
                <div className="step-number">3</div>
                <div className="step-label">Choose Date & Time</div>
              </div>
              <div
                className={`wizard-step-node ${wizardStep === 4 ? 'active' : ''} ${wizardStep > 4 ? 'completed' : ''}`}
              >
                <div className="step-number">4</div>
                <div className="step-label">Confirm</div>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT BRANCH & CHOOSE PRELIMINARY SERVICES */}
          {wizardStep === 1 && (
            <div>
              <h3>Step 1: Select Branch</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Please select the branch most convenient for you.
              </p>

              {branchesLoading ? (
                <p>Loading branches...</p>
              ) : branches.length === 0 ? (
                <p>No active branches available. Please contact the shop to create or activate a branch.</p>
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
                          🕒 Hours: {b.openTime.substring(0, 5)} - {b.closeTime.substring(0, 5)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <AnimatedButton type="button" variant="ghost" onClick={() => setViewMode('list')} showArrow={false}>
                  ← Cancel
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={!selectedBranchId}
                  onClick={() => setWizardStep(2)}
                >
                  Next
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT VEHICLE OR ADD VEHICLE */}
          {wizardStep === 2 && (
            <div>
              <h3>Step 2: Choose Your Vehicle</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Select the vehicle you want to wash or register a new one below.
              </p>

              <div className="wizard-selection-grid">
                {vehicles.map(v => {
                  const plate = v.LicensePlate || v.licensePlate;
                  const brand = v.BrandCatalogName || v.brandCatalogName || v.Brand || v.brand || 'Unknown Brand';
                  const type = v.VehicleType ?? v.vehicleType ?? 2;
                  const id = v.VehicleId || v.vehicleId;
                  return (
                    <div
                      key={id || plate}
                      className={`wizard-card-item ${selectedVehicleId === id ? 'selected' : ''}`}
                      onClick={() => id && setSelectedVehicleId(id)}
                    >
                      <div className="wizard-card-item-indicator" />
                      <h4 style={{ color: 'var(--color-heading)', marginBottom: '4px' }}>
                        🚘 {plate}
                      </h4>
                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: '10px',
                        }}
                      >
                        {brand}
                      </p>
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
                      <span>Register New Vehicle</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="wizard-card-item"
                    style={{ border: '1px solid var(--color-primary)', cursor: 'default' }}
                  >
                    <h4 style={{ marginBottom: '12px' }}>Quick Register</h4>
                    <form
                      onSubmit={handleQuickVehicleSubmit}
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          License Plate
                        </label>
                        <input
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickPlate}
                          onChange={e => setQuickPlate(e.target.value)}
                          placeholder="30F-123.45"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Vehicle Type
                        </label>
                        <select
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                          value={quickType}
                          onChange={e => {
                            setQuickType(Number(e.target.value) as VehicleType);
                            setQuickBrandCatalogId('');
                            setQuickBrand('');
                            setQuickBodyStyle('');
                            setQuickBodyStyleCatalogId('');
                          }}
                        >
                          <option value={2}>Car</option>
                          <option value={1}>Motorbike</option>
                          <option value={3}>Truck (Xe tải / xe ba gác)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Brand
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
                          <option value="">-- Select brand --</option>
                          {brandCatalogs
                            .filter(cat => Number(cat.vehicleType ?? cat.VehicleType) === Number(quickType))
                            .map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          <option value={CUSTOM_BRAND_VALUE}>Other / custom</option>
                        </select>
                        {quickBrandCatalogId === CUSTOM_BRAND_VALUE && (
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.9rem', marginTop: 8 }}
                            value={quickBrand}
                            onChange={e => setQuickBrand(e.target.value)}
                            placeholder="Enter brand"
                            maxLength={50}
                          />
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          Model (Dòng xe)
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
                          Cancel
                        </AnimatedButton>
                        <AnimatedButton
                          type="submit"
                          variant="primary"
                          style={{ flex: 1 }}
                          disabled={quickVehicleLoading}
                        >
                          {quickVehicleLoading ? 'Creating...' : 'Save Vehicle'}
                        </AnimatedButton>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <AnimatedButton type="button" variant="ghost" onClick={() => setWizardStep(1)} showArrow={false}>
                  ← Back
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={!selectedVehicleId}
                  onClick={() => setWizardStep(3)}
                >
                  Next
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT SERVICES & DATE/TIME SLOT */}
          {wizardStep === 3 && (
            <div>
              <h3>Step 3: Services & Appointment Time</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Please select the services you need and choose an available time slot.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                {/* Services list (Left) */}
                <div>
                  <h4
                    style={{
                      borderBottom: '1px solid var(--color-border-dim)',
                      paddingBottom: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    Car Wash Services
                  </h4>
                  {services.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      No services available at this branch.
                    </p>
                  ) : (
                    <div className="wizard-service-list">
                      {services.map(s => {
                        const isSelected = selectedServiceIds.includes(s.serviceId);
                        return (
                          <div
                            key={s.serviceId}
                            className={`wizard-service-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedServiceIds(prev =>
                                isSelected
                                  ? prev.filter(id => id !== s.serviceId)
                                  : [...prev, s.serviceId]
                              );
                            }}
                          >
                            <div className="wizard-service-checkbox" />
                            <div className="wizard-service-info">
                              <h5>{s.serviceName}</h5>
                              <p>⏱️ Est. Duration: {s.durationMinutes} mins</p>
                            </div>
                            <div className="wizard-service-price">{formatVND(s.basePrice)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Date & Time Slot selection (Right) */}
                <div>
                  <h4
                    style={{
                      borderBottom: '1px solid var(--color-border-dim)',
                      paddingBottom: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    Appointment Schedule
                  </h4>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Select Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      min={getLocalDateString()}
                    />
                  </div>

                  <label className="form-label">Available Time Slots</label>
                  {slots.length === 0 ? (
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '8px',
                      }}
                    >
                      No available time slots on this date. Please select another date.
                    </p>
                  ) : (
                    <div className="slots-time-grid">
                      {slots.map(slot => {
                        const isSelected = selectedSlotId === slot.slotInventoryId;
                        const isFull = slot.availableCount <= 0;
                        const isPast = isSlotInPast(slot.slotDate, slot.slotStartTime);
                        const isDisable = isFull || isPast;
                        return (
                          <div
                            key={slot.slotInventoryId}
                            className={`slot-chip-item ${isSelected ? 'selected' : ''} ${isDisable ? 'disabled' : ''}`}
                            onClick={() => !isDisable && setSelectedSlotId(slot.slotInventoryId)}
                          >
                            <span className="slot-chip-time">
                              {slot.slotStartTime ? slot.slotStartTime.substring(0, 5) : '00:00'}
                            </span>
                            <span className="slot-chip-meta">
                              {isPast
                                ? 'Past'
                                : isFull
                                  ? 'Full'
                                  : `${slot.availableCount} slots left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '30px',
                  borderTop: '1px solid var(--color-border-dim)',
                  paddingTop: '20px',
                }}
              >
                <AnimatedButton type="button" variant="ghost" onClick={() => setWizardStep(2)} showArrow={false}>
                  ← Back
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={selectedServiceIds.length === 0 || !selectedSlotId}
                  onClick={() => setWizardStep(4)}
                >
                  View Quote &amp; Confirm
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 4: QUOTE PREVIEW & CONFIRM */}
          {wizardStep === 4 && (
            <div>
              <h3>Step 4: Invoice & Confirmation</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Please review your booking details and confirm below.
              </p>

              {quoteLoading ? (
                <p style={{ padding: '20px', textAlign: 'center' }}>Loading invoice details...</p>
              ) : !quote ? (
                <p className="badge badge-danger" style={{ display: 'block', padding: '10px' }}>
                  Failed to calculate quote. Please go back and try again.
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
                      Invoice Summary
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
                      Booking Summary
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
                        Selected Branch
                      </p>
                      <p style={{ fontWeight: 600 }}>
                        {branches.find(b => b.branchId === selectedBranchId)?.name ||
                          'Selected Branch'}
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
                        Date & Time
                      </p>
                      <p style={{ fontWeight: 600 }}>
                        {selectedDate} at{' '}
                        {slots
                          .find(s => s.slotInventoryId === selectedSlotId)
                          ?.slotStartTime?.substring(0, 5) || 'Selected Time'}
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
                        Vehicle
                      </p>
                      <p style={{ fontWeight: 600 }}>
                        🚘{' '}
                        {vehicles.find(v => (v.VehicleId || v.vehicleId) === selectedVehicleId)
                          ?.LicensePlate ||
                          vehicles.find(v => (v.VehicleId || v.vehicleId) === selectedVehicleId)
                            ?.licensePlate ||
                          'Selected Vehicle'}
                      </p>
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
                  ← Back
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="primary"
                  disabled={submitLoading || !quote}
                  onClick={handleConfirmBooking}
                >
                  {submitLoading ? 'Creating booking...' : 'Confirm & Book Now'}
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING SUCCESSFUL + PAYMENT LINKS */}
          {wizardStep === 5 && newBooking && (
            <div className="booking-success-card">
              <div className="success-icon-wrap">✓</div>
              <h2>Booking Successful!</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: '460px' }}>
                Thank you for choosing AutoWashPro. Your booking has been received and confirmed.
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
                    Check-in Code: <strong>{newBooking.bookingCode}</strong>
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
                    Booking Summary
                  </h4>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    📅 <strong>Date:</strong> {newBooking.slotDate}
                  </p>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    🕒 <strong>Time:</strong>{' '}
                    {newBooking.slotStartTime ? newBooking.slotStartTime.substring(0, 5) : '00:00'}
                  </p>
                  <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                    🚘 <strong>License Plate:</strong> {newBooking.licensePlate}
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
                      🎁 <strong>Discount:</strong> -{formatVND(newBooking.bookingDiscountAmount)}
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
                    💰 <strong>Total Amount:</strong> {formatVND(newBooking.bookingFinalAmount)}
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
                  💳 Online Deposit / Payment via VNPay
                </h4>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                    lineHeight: '1.4',
                  }}
                >
                  To guarantee your spot and speed up check-in, please choose to pay a 50% deposit
                  online or pay the full 100% amount now via VNPay.
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
                    Pay 50% Deposit ({formatVND(newBooking.bookingFinalAmount / 2)})
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    variant="secondary"
                    onClick={() => handlePaymentRedirect(newBooking.bookingId, true)}
                  >
                    Pay 100% Full ({formatVND(newBooking.bookingFinalAmount)})
                  </AnimatedButton>
                </div>
              </div>

              <AnimatedButton
                type="button"
                variant="ghost"
                style={{ marginTop: '20px' }}
                onClick={() => setViewMode('list')}
              >
                Back to Appointments List
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
              <h3>Booking: {selectedBooking.bookingCode}</h3>
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
                  <span className="booking-detail-item-label">Date</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.slotDate || 'Not scheduled'}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Time Slot</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.slotStartTime
                      ? selectedBooking.slotStartTime.substring(0, 5)
                      : 'Not scheduled'}
                    {selectedBooking.slotEndTime
                      ? ` - ${selectedBooking.slotEndTime.substring(0, 5)}`
                      : ''}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Vehicle</span>
                  <span className="booking-detail-item-value">
                    🚘 {selectedBooking.licensePlate || 'None'} (
                    {selectedBooking.vehicleBrand || 'Unknown Brand'})
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Vehicle Type</span>
                  <span className="booking-detail-item-value">
                    {getVehicleLabel(selectedBooking.vehicleType)}
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Loyalty Points Earned</span>
                  <span className="booking-detail-item-value">
                    +{selectedBooking.earnedPoints || 0} pts
                  </span>
                </div>
                <div className="booking-detail-item">
                  <span className="booking-detail-item-label">Created At</span>
                  <span className="booking-detail-item-value">
                    {selectedBooking.createdAtUtc
                      ? new Date(selectedBooking.createdAtUtc).toLocaleDateString('en-US')
                      : 'Unknown'}
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
                <div className="booking-detail-services-title">Services List</div>
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
                    <span>No services found.</span>
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
                    <span>Total Amount</span>
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
                        <span>Online Deposit Paid</span>
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
                        <span>Remaining Balance to Pay at Counter</span>
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
                      <span>Total Amount to Pay</span>
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
                    Service Review
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
                              No comment.
                            </p>
                          )}
                          {review.isHidden && (
                            <span
                              className="badge badge-danger"
                              style={{ marginTop: '8px', display: 'inline-block' }}
                            >
                              This review is hidden by management
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
                            You haven't reviewed this appointment yet. Share your experience with
                            us!
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleOpenReviewModal(selectedBooking);
                            }}
                          >
                            Write Review
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
                    Present this QR code or Booking ID to staff at the branch counter for check-in.
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
                  Pay Deposit (50%)
                </AnimatedButton>
              )}
              {(selectedBooking.bookingStatus === 1 || selectedBooking.bookingStatus === 2) && (
                <AnimatedButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelBookingClick(selectedBooking)}
                >
                  Cancel Appointment
                </AnimatedButton>
              )}
              <AnimatedButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCancelConfirm && !!bookingToCancel}
        title="Cancel Appointment"
        variant="danger"
        onCancel={() => {
          setShowCancelConfirm(false);
          setBookingToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        confirmText="Cancel Appointment"
        cancelText="Dismiss"
        message={
          <>
            <p>
              Are you sure you want to cancel booking code{' '}
              <span className="highlight-plate">{bookingToCancel?.bookingCode}</span>?
            </p>
            <div
              className="form-group"
              style={{ width: '100%', textAlign: 'left', marginTop: '12px' }}
            >
              <label className="form-label" htmlFor="cancel-reason-input">
                Reason for Cancellation
              </label>
              <textarea
                id="cancel-reason-input"
                className="form-input"
                style={{ minHeight: '80px', color: 'var(--color-heading)' }}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason (e.g., busy schedule, change of mind...)"
                required
              />
            </div>
            <div
              className="confirm-modal-warning"
              style={{ fontSize: '0.8rem', marginTop: '12px' }}
            >
              This action will release your slot for other customers and free up the schedule.
            </div>
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
