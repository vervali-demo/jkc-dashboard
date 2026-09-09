import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SyncIcon from "@mui/icons-material/Sync";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CloseIcon from "@mui/icons-material/Close";

import * as XLSX from "xlsx";

import StatusBadge from "../components/StatusBadge";
import {
    orders,
    ORDER_STATUSES,
    DIVISIONS,
    APPROVAL_LEVELS,
} from "../data/order";

import "../styles/order.css";

// --------------------------------------------------
// DATE PARSER
// --------------------------------------------------

const parseOrderDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const valueString = String(value).trim();

    // DD/MM/YYYY HH:mm:ss
    const match = valueString.match(
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );

    if (match) {
        const [, day, month, year, hours = "0", minutes = "0", seconds = "0"] =
            match;

        const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes),
            Number(seconds),
        );

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const fallbackDate = new Date(valueString);

    return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

// --------------------------------------------------
// DATE TO INPUT VALUE
// --------------------------------------------------

const formatDateForInput = (date) => {
    if (!date) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// --------------------------------------------------
// DATE RANGE
// --------------------------------------------------

const getPresetRange = (days, referenceDate) => {
    const start = new Date(referenceDate);

    start.setHours(0, 0, 0, 0);

    start.setDate(start.getDate() - (days - 1));

    const end = new Date(referenceDate);

    end.setHours(23, 59, 59, 999);

    return {
        from: formatDateForInput(start),
        to: formatDateForInput(end),
    };
};

// --------------------------------------------------
// STATUS
// --------------------------------------------------

const getOrderStatus = (order) => {
    return order.status || order.orderState || "Unknown";
};

const normalizeStatus = (status) => {
    return String(status || "")
        .trim()
        .toLowerCase();
};

const isSameDay = (dateA, dateB) => {
    if (!dateA || !dateB) {
        return false;
    }

    return (
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate()
    );
};

const matchesSummaryFilter = (order, summaryFilter, referenceDate) => {
    if (!summaryFilter || summaryFilter === "total" || summaryFilter === "value") {
        return true;
    }

    const status = normalizeStatus(getOrderStatus(order));
    const orderDate = parseOrderDate(order.orderDate);

    if (summaryFilter === "newToday") {
        return (
            isSameDay(orderDate, referenceDate) &&
            (status === "placed" || status === "new" || status === "pending")
        );
    }

    if (summaryFilter === "pending") {
        return (
            status === "accepted" ||
            status === "partial fulfilled"
        );
    }

    if (summaryFilter === "approvalPending") {
        return status === "distributor edit" || status === "placed";
    }

    return true;
};

// --------------------------------------------------
// CURRENCY
// --------------------------------------------------

const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

// --------------------------------------------------
// SORTABLE COLUMNS
// --------------------------------------------------

const SUMMARY_FILTER_LABELS = {
    newToday: "New Order Today",
    pending: "Pending Orders",
    approvalPending: "Approval Pending",
    total: "Total Orders",
    value: "Total Order Value",
};

const SORTABLE_COLUMNS = [
    { key: "id", label: "Bizom Order ID" },
    { key: "erpId", label: "Order ERP ID" },
    { key: "outlet", label: "JCP Outlet" },
    { key: "division", label: "Division" },
    { key: "amount", label: "Amount" },
    { key: "comment", label: "Comment" },
    { key: "orderDate", label: "Order Date" },
    { key: "status", label: "Order State" },
    { key: "user", label: "User" },
    { key: "distributor", label: "Distributor" },
    { key: "shipTo", label: "Ship To" },
];

const getSortValue = (order, key) => {
    switch (key) {
        case "amount":
            return Number(order.amount || 0);
        case "orderDate":
            return parseOrderDate(order.orderDate)?.getTime() || 0;
        case "status":
            return normalizeStatus(getOrderStatus(order));
        case "id":
        case "erpId":
        case "outlet":
        case "division":
        case "comment":
        case "user":
        case "distributor":
        case "shipTo":
            return String(order[key] || "").toLowerCase();
        default:
            return "";
    }
};

const renderCheckIcon = (checked) =>
    checked ? (
        <CheckBoxIcon className="status-check-icon checked" fontSize="small" />
    ) : (
        <CheckBoxOutlineBlankIcon
            className="status-check-icon"
            fontSize="small"
        />
    );

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const OrderDashboard = () => {
    const navigate = useNavigate();

    const [search, setSearch] = useState("");

    const [selectedStatuses, setSelectedStatuses] = useState([]);

    const [selectedDivisions, setSelectedDivisions] = useState([]);

    const [selectedDistributors, setSelectedDistributors] = useState([]);

    const [selectedApprovalLevels, setSelectedApprovalLevels] = useState([]);

    const [summaryFilter, setSummaryFilter] = useState(null);

    const [isSyncing, setIsSyncing] = useState(false);

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    const [divisionDropdownOpen, setDivisionDropdownOpen] = useState(false);

    const [distributorDropdownOpen, setDistributorDropdownOpen] =
        useState(false);

    const [approvalDropdownOpen, setApprovalDropdownOpen] = useState(false);

    const [distributorSearch, setDistributorSearch] = useState("");

    const [datePreset, setDatePreset] = useState("30");

    const [fromDate, setFromDate] = useState("");

    const [toDate, setToDate] = useState("");

    const [expandedOrders, setExpandedOrders] = useState(() => new Set());

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: "asc",
    });

    const [currentPage, setCurrentPage] = useState(1);

    const [rowsPerPage, setRowsPerPage] = useState(5);

    const statusDropdownRef = React.useRef(null);
    const divisionDropdownRef = React.useRef(null);
    const distributorDropdownRef = React.useRef(null);
    const approvalDropdownRef = React.useRef(null);

    // --------------------------------------------------
    // DEMO REFERENCE DATE
    // --------------------------------------------------
    // This uses the latest mock order date.
    // Therefore your July 2026 mock data will appear.
    //
    // For production API data you can replace this with:
    //
    // const referenceDate = new Date();
    // --------------------------------------------------

    const referenceDate = useMemo(() => {
        let latestDate = null;

        orders.forEach((order) => {
            const date = parseOrderDate(order.orderDate);

            if (date && (!latestDate || date > latestDate)) {
                latestDate = date;
            }
        });

        return latestDate || new Date();
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                statusDropdownRef.current &&
                !statusDropdownRef.current.contains(event.target)
            ) {
                setStatusDropdownOpen(false);
            }

            if (
                divisionDropdownRef.current &&
                !divisionDropdownRef.current.contains(event.target)
            ) {
                setDivisionDropdownOpen(false);
            }

            if (
                distributorDropdownRef.current &&
                !distributorDropdownRef.current.contains(event.target)
            ) {
                setDistributorDropdownOpen(false);
            }

            if (
                approvalDropdownRef.current &&
                !approvalDropdownRef.current.contains(event.target)
            ) {
                setApprovalDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const distributorOptions = useMemo(() => {
        const names = new Set();

        orders.forEach((order) => {
            if (order.distributor) {
                names.add(order.distributor);
            }
        });

        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, []);

    const filteredDistributorOptions = useMemo(() => {
        const query = distributorSearch.trim().toLowerCase();

        if (!query) {
            return distributorOptions;
        }

        return distributorOptions.filter((name) =>
            name.toLowerCase().includes(query),
        );
    }, [distributorOptions, distributorSearch]);

    // --------------------------------------------------
    // INITIAL DATE RANGE
    // --------------------------------------------------

    useEffect(() => {
        const range = getPresetRange(Number(datePreset), referenceDate);

        setFromDate(range.from);
        setToDate(range.to);
    }, [referenceDate, datePreset]);

    // --------------------------------------------------
    // DATE PRESET CHANGE
    // --------------------------------------------------

    const handleDatePresetChange = (value) => {
        setDatePreset(value);

        if (value !== "custom") {
            const range = getPresetRange(Number(value), referenceDate);

            setFromDate(range.from);
            setToDate(range.to);
        }
    };

    // --------------------------------------------------
    // DATE FILTERED ORDERS
    // --------------------------------------------------

    const dateFilteredOrders = useMemo(() => {
        if (!fromDate && !toDate) {
            return orders;
        }

        const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

        const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

        return orders.filter((order) => {
            const orderDate = parseOrderDate(order.orderDate);

            if (!orderDate) {
                return false;
            }

            if (from && orderDate < from) {
                return false;
            }

            if (to && orderDate > to) {
                return false;
            }

            return true;
        });
    }, [fromDate, toDate]);

    // --------------------------------------------------
    // SEARCH + STATUS
    // --------------------------------------------------

    const filteredOrders = useMemo(() => {
        const searchValue = search.trim().toLowerCase();
        const selectedNormalized = selectedStatuses.map((status) =>
            normalizeStatus(status),
        );

        return dateFilteredOrders.filter((order) => {
            const status = getOrderStatus(order);

            if (!matchesSummaryFilter(order, summaryFilter, referenceDate)) {
                return false;
            }

            const matchesStatus =
                selectedNormalized.length === 0 ||
                selectedNormalized.includes(normalizeStatus(status));

            if (!matchesStatus) {
                return false;
            }

            const matchesDivision =
                selectedDivisions.length === 0 ||
                selectedDivisions.includes(order.division);

            if (!matchesDivision) {
                return false;
            }

            const matchesDistributor =
                selectedDistributors.length === 0 ||
                selectedDistributors.includes(order.distributor);

            if (!matchesDistributor) {
                return false;
            }

            const matchesApproval =
                selectedApprovalLevels.length === 0 ||
                selectedApprovalLevels.includes(order.approvalLevel);

            if (!matchesApproval) {
                return false;
            }

            if (!searchValue) {
                return true;
            }

            const itemText = (order.items || [])
                .map((item) => `${item.product} ${item.sku || ""}`)
                .join(" ");

            const searchableText = `
        ${order.id}
        ${order.erpId}
        ${order.outlet}
        ${order.division}
        ${order.amount}
        ${order.comment}
        ${order.orderDate}
        ${status}
        ${order.approvalLevel || ""}
        ${order.user}
        ${order.distributor}
        ${order.shipTo}
        ${itemText}
      `.toLowerCase();

            return searchableText.includes(searchValue);
        });
    }, [
        dateFilteredOrders,
        search,
        selectedStatuses,
        selectedDivisions,
        selectedDistributors,
        selectedApprovalLevels,
        summaryFilter,
        referenceDate,
    ]);

    // --------------------------------------------------
    // SORT
    // --------------------------------------------------

    const sortedOrders = useMemo(() => {
        if (!sortConfig.key) {
            return filteredOrders;
        }

        const sorted = [...filteredOrders];

        sorted.sort((a, b) => {
            const aValue = getSortValue(a, sortConfig.key);
            const bValue = getSortValue(b, sortConfig.key);

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }

            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }

            return 0;
        });

        return sorted;
    }, [filteredOrders, sortConfig]);

    // --------------------------------------------------
    // SUMMARY CARDS
    // --------------------------------------------------

    const summary = useMemo(() => {
        const newTodayOrders = dateFilteredOrders.filter((order) => {
            const status = normalizeStatus(getOrderStatus(order));
            const orderDate = parseOrderDate(order.orderDate);

            return (
                isSameDay(orderDate, referenceDate) &&
                (status === "placed" || status === "new" || status === "pending")
            );
        });

        const pendingOrders = dateFilteredOrders.filter((order) => {
            const status = normalizeStatus(getOrderStatus(order));

            return status === "accepted" || status === "partial fulfilled";
        });

        const approvalPendingOrders = dateFilteredOrders.filter((order) => {
            const status = normalizeStatus(getOrderStatus(order));

            return status === "distributor edit" || status === "placed";
        });

        const totalValue = dateFilteredOrders.reduce(
            (total, order) => total + Number(order.amount || 0),
            0,
        );

        return {
            newToday: newTodayOrders.length,
            pendingOrders: pendingOrders.length,
            approvalPending: approvalPendingOrders.length,
            totalOrders: dateFilteredOrders.length,
            totalValue,
        };
    }, [dateFilteredOrders, referenceDate]);

    // --------------------------------------------------
    // PAGINATION
    // --------------------------------------------------

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        selectedStatuses,
        selectedDivisions,
        selectedDistributors,
        selectedApprovalLevels,
        summaryFilter,
        fromDate,
        toDate,
        rowsPerPage,
        sortConfig,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(sortedOrders.length / rowsPerPage),
    );

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;

        const end = start + rowsPerPage;

        return sortedOrders.slice(start, end);
    }, [sortedOrders, currentPage, rowsPerPage]);

    // --------------------------------------------------
    // SORT HANDLER
    // --------------------------------------------------

    const handleSort = (key) => {
        setSortConfig((current) => {
            if (current.key === key) {
                return {
                    key,
                    direction: current.direction === "asc" ? "desc" : "asc",
                };
            }

            return { key, direction: "asc" };
        });
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <UnfoldMoreIcon className="sort-icon" fontSize="inherit" />;
        }

        return sortConfig.direction === "asc" ? (
            <ArrowUpwardIcon className="sort-icon active" fontSize="inherit" />
        ) : (
            <ArrowDownwardIcon className="sort-icon active" fontSize="inherit" />
        );
    };

    // --------------------------------------------------
    // INLINE DETAILS (MULTI EXPAND)
    // --------------------------------------------------

    const toggleDetails = (orderId) => {
        setExpandedOrders((current) => {
            const next = new Set(current);

            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }

            return next;
        });
    };

    const closeAllDropdowns = () => {
        setStatusDropdownOpen(false);
        setDivisionDropdownOpen(false);
        setDistributorDropdownOpen(false);
        setApprovalDropdownOpen(false);
    };

    const toggleListValue = (setter, value) => {
        setter((current) => {
            if (current.includes(value)) {
                return current.filter((item) => item !== value);
            }

            return [...current, value];
        });
    };

    const toggleStatusOption = (status) => {
        setSummaryFilter(null);
        toggleListValue(setSelectedStatuses, status);
    };

    const toggleDivisionOption = (division) => {
        toggleListValue(setSelectedDivisions, division);
    };

    const toggleDistributorOption = (distributor) => {
        toggleListValue(setSelectedDistributors, distributor);
    };

    const toggleApprovalOption = (level) => {
        toggleListValue(setSelectedApprovalLevels, level);
    };

    const handleSummaryCardClick = (filterKey) => {
        setSelectedStatuses([]);
        closeAllDropdowns();

        setSummaryFilter((current) =>
            current === filterKey ? null : filterKey,
        );
    };

    const clearSummaryFilter = () => {
        setSummaryFilter(null);
    };

    const handleSync = () => {
        // Static for now — will fetch latest API data later.
        setIsSyncing(true);

        window.setTimeout(() => {
            setIsSyncing(false);
        }, 800);
    };

    const getMultiSelectLabel = (selected, emptyLabel) => {
        if (selected.length === 0) {
            return emptyLabel;
        }

        if (selected.length === 1) {
            return selected[0];
        }

        return `${selected.length} selected`;
    };

    const statusDropdownLabel = getMultiSelectLabel(
        selectedStatuses,
        "All Status",
    );

    const divisionDropdownLabel = getMultiSelectLabel(
        selectedDivisions,
        "All Division",
    );

    const distributorDropdownLabel = getMultiSelectLabel(
        selectedDistributors,
        "All Distributors",
    );

    const approvalDropdownLabel = getMultiSelectLabel(
        selectedApprovalLevels,
        "Approval Level",
    );

    // --------------------------------------------------
    // EXCEL EXPORT
    // --------------------------------------------------

    const handleExportExcel = () => {
        const exportRows = [];

        filteredOrders.forEach((order) => {
            const items = order.items || [];

            if (items.length === 0) {
                exportRows.push({
                    "Bizom Order ID": order.id,
                    "Order ERP ID": order.erpId,
                    "JCP Outlet": order.outlet,
                    Division: order.division || "",
                    Amount: order.amount,
                    Comment: order.comment,
                    "Order Date": order.orderDate,
                    "Order State": getOrderStatus(order),
                    "Approval Level": order.approvalLevel || "",
                    User: order.user,
                    "Warehouse / Distributor": order.distributor,
                    "Ship To": order.shipTo,
                    Product: "",
                    Quantity: "",
                    "Unit Price": "",
                    "Item Amount": "",
                });
            } else {
                items.forEach((item) => {
                    exportRows.push({
                        "Bizom Order ID": order.id,
                        "Order ERP ID": order.erpId,
                        "JCP Outlet": order.outlet,
                        Division: order.division || "",
                        Amount: order.amount,
                        Comment: order.comment,
                        "Order Date": order.orderDate,
                        "Order State": getOrderStatus(order),
                        "Approval Level": order.approvalLevel || "",
                        User: order.user,
                        "Warehouse / Distributor": order.distributor,
                        "Ship To": order.shipTo,
                        Product: item.product,
                        Quantity: item.quantity,
                        "Unit Price": item.unitPrice,
                        "Item Amount": item.amount,
                    });
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(exportRows);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

        XLSX.writeFile(workbook, "orders.xlsx");
    };

    // --------------------------------------------------
    // RESET FILTERS
    // --------------------------------------------------

    const handleResetFilters = () => {
        setSearch("");

        setSelectedStatuses([]);
        setSelectedDivisions([]);
        setSelectedDistributors([]);
        setSelectedApprovalLevels([]);
        setDistributorSearch("");
        closeAllDropdowns();
        setSummaryFilter(null);

        setDatePreset("30");

        const range = getPresetRange(30, referenceDate);

        setFromDate(range.from);
        setToDate(range.to);

        setExpandedOrders(new Set());
        setSortConfig({ key: null, direction: "asc" });
    };

    // --------------------------------------------------
    // PAGE NUMBERS
    // --------------------------------------------------

    const pageNumbers = [];

    for (let page = 1; page <= totalPages; page++) {
        if (
            page === 1 ||
            page === totalPages ||
            Math.abs(page - currentPage) <= 1
        ) {
            pageNumbers.push(page);
        }
    }

    return (
        <div className="orders-page">
            {/* =========================================
          PAGE HEADER
      ========================================= */}

            <div className="orders-header">
                <div>
                    <div className="breadcrumb">Dashboard / Orders</div>

                    <h1>Orders</h1>

                    <p>Manage and track all customer orders</p>
                </div>
            </div>

            {/* =========================================
          SUMMARY CARDS
      ========================================= */}

            <div className="summary-grid">
                <button
                    type="button"
                    className={`summary-card ${
                        summaryFilter === "newToday" ? "active" : ""
                    }`}
                    onClick={() => handleSummaryCardClick("newToday")}
                >
                    <div className="summary-icon new-icon">
                        <ShoppingCartIcon />
                    </div>

                    <div>
                        <span>New Order Today</span>

                        <strong>{summary.newToday}</strong>
                    </div>
                </button>

                <button
                    type="button"
                    className={`summary-card ${
                        summaryFilter === "pending" ? "active" : ""
                    }`}
                    onClick={() => handleSummaryCardClick("pending")}
                >
                    <div className="summary-icon pending-icon">
                        <PendingActionsIcon />
                    </div>

                    <div>
                        <span>Pending Orders</span>

                        <strong>{summary.pendingOrders}</strong>
                    </div>
                </button>

                <button
                    type="button"
                    className={`summary-card ${
                        summaryFilter === "approvalPending" ? "active" : ""
                    }`}
                    onClick={() => handleSummaryCardClick("approvalPending")}
                >
                    <div className="summary-icon approval-icon">
                        <HourglassTopIcon />
                    </div>

                    <div>
                        <span>Approval Pending</span>

                        <strong>{summary.approvalPending}</strong>
                    </div>
                </button>

                <button
                    type="button"
                    className={`summary-card ${
                        summaryFilter === "total" ? "active" : ""
                    }`}
                    onClick={() => handleSummaryCardClick("total")}
                >
                    <div className="summary-icon total-icon">
                        <ShoppingCartIcon />
                    </div>

                    <div>
                        <span>Total Orders</span>

                        <strong>{summary.totalOrders}</strong>
                    </div>
                </button>

                <button
                    type="button"
                    className={`summary-card summary-card-value ${
                        summaryFilter === "value" ? "active" : ""
                    }`}
                    onClick={() => handleSummaryCardClick("value")}
                >
                    <div className="summary-icon amount-icon">
                        <CurrencyRupeeIcon />
                    </div>

                    <div>
                        <span>Total Order Value</span>

                        <strong className="summary-amount-value">
                            {formatCurrency(summary.totalValue)}
                        </strong>
                    </div>
                </button>
            </div>

            {/* =========================================
          FILTER BAR
      ========================================= */}

            <div className="filter-card">
                <div className="filter-row">
                    <div className="search-wrapper">
                        <SearchIcon className="search-icon" />

                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-controls">
                        {/* MULTI SELECT STATUS */}

                        <div
                            className="status-multiselect"
                            ref={statusDropdownRef}
                        >
                            <button
                                type="button"
                                className="status-multiselect-trigger"
                                onClick={() => {
                                    setDivisionDropdownOpen(false);
                                    setDistributorDropdownOpen(false);
                                    setApprovalDropdownOpen(false);
                                    setStatusDropdownOpen((open) => !open);
                                }}
                            >
                                <span>{statusDropdownLabel}</span>
                                <KeyboardArrowDownIcon fontSize="small" />
                            </button>

                            {statusDropdownOpen && (
                                <div className="status-multiselect-menu">
                                    {ORDER_STATUSES.map((status) => {
                                        const checked =
                                            selectedStatuses.includes(status);

                                        return (
                                            <label
                                                key={status}
                                                className="status-multiselect-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggleStatusOption(
                                                            status,
                                                        )
                                                    }
                                                />
                                                {renderCheckIcon(checked)}
                                                <span>{status}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* DIVISION */}

                        <div
                            className="status-multiselect"
                            ref={divisionDropdownRef}
                        >
                            <button
                                type="button"
                                className="status-multiselect-trigger"
                                onClick={() => {
                                    setStatusDropdownOpen(false);
                                    setDistributorDropdownOpen(false);
                                    setApprovalDropdownOpen(false);
                                    setDivisionDropdownOpen((open) => !open);
                                }}
                            >
                                <span>{divisionDropdownLabel}</span>
                                <KeyboardArrowDownIcon fontSize="small" />
                            </button>

                            {divisionDropdownOpen && (
                                <div className="status-multiselect-menu">
                                    {DIVISIONS.map((division) => {
                                        const checked =
                                            selectedDivisions.includes(
                                                division,
                                            );

                                        return (
                                            <label
                                                key={division}
                                                className="status-multiselect-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggleDivisionOption(
                                                            division,
                                                        )
                                                    }
                                                />
                                                {renderCheckIcon(checked)}
                                                <span>{division}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* DISTRIBUTOR */}

                        <div
                            className="status-multiselect distributor-multiselect"
                            ref={distributorDropdownRef}
                        >
                            <button
                                type="button"
                                className="status-multiselect-trigger"
                                onClick={() => {
                                    setStatusDropdownOpen(false);
                                    setDivisionDropdownOpen(false);
                                    setApprovalDropdownOpen(false);
                                    setDistributorDropdownOpen((open) => !open);
                                }}
                            >
                                <span>{distributorDropdownLabel}</span>
                                <KeyboardArrowDownIcon fontSize="small" />
                            </button>

                            {distributorDropdownOpen && (
                                <div className="status-multiselect-menu distributor-menu">
                                    <div className="distributor-search">
                                        <SearchIcon fontSize="small" />
                                        <input
                                            type="text"
                                            placeholder="Search distributor..."
                                            value={distributorSearch}
                                            onChange={(event) =>
                                                setDistributorSearch(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="distributor-options">
                                        {filteredDistributorOptions.length ===
                                        0 ? (
                                            <div className="distributor-empty">
                                                No distributors found
                                            </div>
                                        ) : (
                                            filteredDistributorOptions.map(
                                                (distributor) => {
                                                    const checked =
                                                        selectedDistributors.includes(
                                                            distributor,
                                                        );

                                                    return (
                                                        <label
                                                            key={distributor}
                                                            className="status-multiselect-option"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    checked
                                                                }
                                                                onChange={() =>
                                                                    toggleDistributorOption(
                                                                        distributor,
                                                                    )
                                                                }
                                                            />
                                                            {renderCheckIcon(
                                                                checked,
                                                            )}
                                                            <span>
                                                                {distributor}
                                                            </span>
                                                        </label>
                                                    );
                                                },
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* APPROVAL PENDING LEVEL */}

                        <div
                            className="status-multiselect"
                            ref={approvalDropdownRef}
                        >
                            <button
                                type="button"
                                className="status-multiselect-trigger"
                                onClick={() => {
                                    setStatusDropdownOpen(false);
                                    setDivisionDropdownOpen(false);
                                    setDistributorDropdownOpen(false);
                                    setApprovalDropdownOpen((open) => !open);
                                }}
                            >
                                <span>{approvalDropdownLabel}</span>
                                <KeyboardArrowDownIcon fontSize="small" />
                            </button>

                            {approvalDropdownOpen && (
                                <div className="status-multiselect-menu">
                                    {APPROVAL_LEVELS.map((level) => {
                                        const checked =
                                            selectedApprovalLevels.includes(
                                                level,
                                            );

                                        return (
                                            <label
                                                key={level}
                                                className="status-multiselect-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggleApprovalOption(
                                                            level,
                                                        )
                                                    }
                                                />
                                                {renderCheckIcon(checked)}
                                                <span>{level}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* DATE PRESET */}

                        <div className="date-filter">
                            <CalendarMonthIcon />

                            <select
                                value={datePreset}
                                onChange={(event) =>
                                    handleDatePresetChange(event.target.value)
                                }
                                className="date-select"
                            >
                                <option value="1">Last 1 Day</option>

                                <option value="7">Last 7 Days</option>

                                <option value="30">Last 30 Days</option>

                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        <button
                            className="reset-btn"
                            onClick={handleResetFilters}
                        >
                            Reset
                        </button>

                        <button
                            className="export-btn"
                            onClick={handleExportExcel}
                        >
                            <DownloadIcon fontSize="small" />
                            Export
                        </button>
                    </div>
                </div>

                {/* CUSTOM DATE */}

                {datePreset === "custom" && (
                    <div className="custom-date-wrapper">
                        <div className="date-input-group">
                            <label>From</label>

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(event) =>
                                    setFromDate(event.target.value)
                                }
                            />
                        </div>

                        <div className="date-input-group">
                            <label>To</label>

                            <input
                                type="date"
                                value={toDate}
                                min={fromDate}
                                onChange={(event) =>
                                    setToDate(event.target.value)
                                }
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================
          TABLE
      ========================================= */}

            <div className="table-card">
                <div className="table-top">
                    <div className="table-top-left">
                        <div className="table-top-title-row">
                            <h2>Order List</h2>

                            {summaryFilter && (
                                <span
                                    className={`active-filter-chip chip-${summaryFilter}`}
                                >
                                    {SUMMARY_FILTER_LABELS[summaryFilter]}
                                    <button
                                        type="button"
                                        className="active-filter-chip-clear"
                                        aria-label="Clear filter"
                                        onClick={clearSummaryFilter}
                                    >
                                        <CloseIcon fontSize="inherit" />
                                    </button>
                                </span>
                            )}
                        </div>

                        <span>
                            {sortedOrders.length} order
                            {sortedOrders.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <button
                        className={`sync-btn ${isSyncing ? "syncing" : ""}`}
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        <SyncIcon fontSize="small" />
                        {isSyncing ? "Syncing..." : "Sync"}
                    </button>
                </div>

                <div className="orders-table-wrapper desktop-orders-table">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                {SORTABLE_COLUMNS.map((column, index) => (
                                    <th
                                        key={column.key}
                                        className={
                                            index === 0
                                                ? "sticky-col"
                                                : undefined
                                        }
                                    >
                                        <button
                                            type="button"
                                            className="sort-header-btn"
                                            onClick={() =>
                                                handleSort(column.key)
                                            }
                                        >
                                            <span>{column.label}</span>
                                            {renderSortIcon(column.key)}
                                        </button>
                                    </th>
                                ))}

                                <th>Details (Cases)</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="no-records">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className="order-row">
                                        <td className="sticky-col">
                                            <button
                                                className="order-id-link"
                                                onClick={() =>
                                                    navigate(
                                                        `/orders/${order.id}`,
                                                    )
                                                }
                                            >
                                                {order.id}
                                            </button>
                                        </td>

                                        <td>{order.erpId}</td>

                                        <td>{order.outlet}</td>

                                        <td>{order.division || "-"}</td>

                                        <td className="amount-cell">
                                            {formatCurrency(order.amount)}
                                        </td>

                                        <td>{order.comment || "-"}</td>

                                        <td>
                                            <div className="order-date">
                                                <strong>
                                                    {
                                                        order.orderDate?.split(
                                                            " ",
                                                        )[0]
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        order.orderDate?.split(
                                                            " ",
                                                        )[1]
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <StatusBadge
                                                status={getOrderStatus(order)}
                                            />
                                        </td>

                                        <td>{order.user}</td>

                                        <td>{order.distributor}</td>

                                        <td>{order.shipTo}</td>

                                        <td className="details-cell">
                                            <button
                                                type="button"
                                                className="details-toggle"
                                                onClick={() =>
                                                    toggleDetails(order.id)
                                                }
                                            >
                                                {expandedOrders.has(order.id)
                                                    ? "Hide details"
                                                    : "Show details"}
                                            </button>

                                            {expandedOrders.has(order.id) && (
                                                <div className="inline-details">
                                                    {(order.items || [])
                                                        .length === 0 ? (
                                                        <div className="inline-detail-item">
                                                            <span className="inline-detail-empty">
                                                                No products
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        (order.items || []).map(
                                                            (item, index) => (
                                                                <div
                                                                    key={
                                                                        item.id ||
                                                                        index
                                                                    }
                                                                    className="inline-detail-item"
                                                                >
                                                                    <strong>
                                                                        {
                                                                            item.product
                                                                        }
                                                                    </strong>
                                                                    <span>
                                                                        {Number(
                                                                            item.unitPrice ||
                                                                                0,
                                                                        ).toLocaleString(
                                                                            "en-IN",
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-orders-list">
                    {paginatedOrders.length === 0 ? (
                        <div className="mobile-orders-empty">
                            No records found
                        </div>
                    ) : (
                        paginatedOrders.map((order) => (
                            <div key={order.id} className="mobile-order-card">
                                <div className="mobile-order-card-top">
                                    <button
                                        type="button"
                                        className="order-id-link"
                                        onClick={() =>
                                            navigate(`/orders/${order.id}`)
                                        }
                                    >
                                        #{order.id}
                                    </button>

                                    <StatusBadge
                                        status={getOrderStatus(order)}
                                    />
                                </div>

                                <div className="mobile-order-row">
                                    <span>Outlet</span>
                                    <strong>{order.outlet}</strong>
                                </div>

                                <div className="mobile-order-row">
                                    <span>Division</span>
                                    <strong>{order.division || "-"}</strong>
                                </div>

                                <div className="mobile-order-row">
                                    <span>Amount</span>
                                    <strong className="mobile-order-amount">
                                        {formatCurrency(order.amount)}
                                    </strong>
                                </div>

                                <div className="mobile-order-row">
                                    <span>Order Date</span>
                                    <strong>
                                        {order.orderDate?.split(" ")[0] || "-"}
                                    </strong>
                                </div>

                                <div className="mobile-order-row">
                                    <span>Distributor</span>
                                    <strong>{order.distributor}</strong>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* =========================================
            PAGINATION
        ========================================= */}

                {sortedOrders.length > 0 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Showing{" "}
                            <strong>
                                {(currentPage - 1) * rowsPerPage + 1}
                            </strong>{" "}
                            to{" "}
                            <strong>
                                {Math.min(
                                    currentPage * rowsPerPage,
                                    sortedOrders.length,
                                )}
                            </strong>{" "}
                            of <strong>{sortedOrders.length}</strong>
                        </div>

                        <div className="pagination-controls">
                            <select
                                value={rowsPerPage}
                                onChange={(event) =>
                                    setRowsPerPage(Number(event.target.value))
                                }
                                className="rows-select"
                            >
                                <option value={5}>5 / page</option>

                                <option value={10}>10 / page</option>

                                <option value={25}>25 / page</option>

                                <option value={50}>50 / page</option>
                            </select>

                            <button
                                className="page-arrow"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    setCurrentPage((page) =>
                                        Math.max(page - 1, 1),
                                    )
                                }
                            >
                                <ChevronLeftIcon />
                            </button>

                            {pageNumbers.map((page, index) => {
                                const previousPage = pageNumbers[index - 1];

                                const showDots =
                                    previousPage && page - previousPage > 1;

                                return (
                                    <React.Fragment key={page}>
                                        {showDots && (
                                            <span className="page-dots">
                                                ...
                                            </span>
                                        )}

                                        <button
                                            className={`page-number ${
                                                currentPage === page
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                );
                            })}

                            <button
                                className="page-arrow"
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                    setCurrentPage((page) =>
                                        Math.min(page + 1, totalPages),
                                    )
                                }
                            >
                                <ChevronRightIcon />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderDashboard;
