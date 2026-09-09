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
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";

import * as XLSX from "xlsx";

import StatusBadge from "../components/StatusBadge";
import { orders, ORDER_STATUSES } from "../data/order";

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

const SORTABLE_COLUMNS = [
    { key: "id", label: "Bizom Order ID" },
    { key: "erpId", label: "Order ERP ID" },
    { key: "outlet", label: "JCP Outlet" },
    { key: "amount", label: "Amount" },
    { key: "comment", label: "Comment" },
    { key: "orderDate", label: "Order Date" },
    { key: "status", label: "Order State" },
    { key: "user", label: "User" },
    { key: "distributor", label: "Warehouse / Distributor" },
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
        case "comment":
        case "user":
        case "distributor":
        case "shipTo":
            return String(order[key] || "").toLowerCase();
        default:
            return "";
    }
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const OrderDashboard = () => {
    const navigate = useNavigate();

    const [search, setSearch] = useState("");

    const [selectedStatuses, setSelectedStatuses] = useState([]);

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    const [datePreset, setDatePreset] = useState("30");

    const [fromDate, setFromDate] = useState("");

    const [toDate, setToDate] = useState("");

    const [expandedOrders, setExpandedOrders] = useState(() => new Set());

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: "asc",
    });

    const [currentPage, setCurrentPage] = useState(1);

    const [rowsPerPage, setRowsPerPage] = useState(10);

    const statusDropdownRef = React.useRef(null);

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
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

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

            const matchesStatus =
                selectedNormalized.length === 0 ||
                selectedNormalized.includes(normalizeStatus(status));

            if (!matchesStatus) {
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
        ${order.amount}
        ${order.comment}
        ${order.orderDate}
        ${status}
        ${order.user}
        ${order.distributor}
        ${order.shipTo}
        ${itemText}
      `.toLowerCase();

            return searchableText.includes(searchValue);
        });
    }, [dateFilteredOrders, search, selectedStatuses]);

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
        const newOrders = dateFilteredOrders.filter((order) => {
            const status = normalizeStatus(getOrderStatus(order));

            return status === "placed" || status === "new" || status === "pending";
        });

        const pendingOrders = dateFilteredOrders.filter((order) => {
            const status = normalizeStatus(getOrderStatus(order));

            return (
                status === "accepted" ||
                status === "distributor edit" ||
                status === "partial fulfilled"
            );
        });

        const totalValue = dateFilteredOrders.reduce(
            (total, order) => total + Number(order.amount || 0),
            0,
        );

        return {
            newOrders: newOrders.length,
            pendingOrders: pendingOrders.length,
            totalOrders: dateFilteredOrders.length,
            totalValue,
        };
    }, [dateFilteredOrders]);

    // --------------------------------------------------
    // PAGINATION
    // --------------------------------------------------

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedStatuses, fromDate, toDate, rowsPerPage, sortConfig]);

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

    const toggleStatusOption = (status) => {
        setSelectedStatuses((current) => {
            if (current.includes(status)) {
                return current.filter((item) => item !== status);
            }

            return [...current, status];
        });
    };

    const statusDropdownLabel =
        selectedStatuses.length === 0
            ? "All Status"
            : selectedStatuses.length === 1
              ? selectedStatuses[0]
              : `${selectedStatuses.length} selected`;

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
                    Amount: order.amount,
                    Comment: order.comment,
                    "Order Date": order.orderDate,
                    "Order State": getOrderStatus(order),
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
                        Amount: order.amount,
                        Comment: order.comment,
                        "Order Date": order.orderDate,
                        "Order State": getOrderStatus(order),
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
        setStatusDropdownOpen(false);

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
                <div className="summary-card">
                    <div className="summary-icon new-icon">
                        <ShoppingCartIcon />
                    </div>

                    <div>
                        <span>New Orders Placed</span>

                        <strong>{summary.newOrders}</strong>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon pending-icon">
                        <PendingActionsIcon />
                    </div>

                    <div>
                        <span>Pending Orders</span>

                        <strong>{summary.pendingOrders}</strong>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon total-icon">
                        <ShoppingCartIcon />
                    </div>

                    <div>
                        <span>Total Orders</span>

                        <strong>{summary.totalOrders}</strong>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon amount-icon">
                        <CurrencyRupeeIcon />
                    </div>

                    <div>
                        <span>Total Order Value</span>

                        <strong className="summary-amount-value">
                            {formatCurrency(summary.totalValue)}
                        </strong>
                    </div>
                </div>
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
                                onClick={() =>
                                    setStatusDropdownOpen((open) => !open)
                                }
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
                                                {checked ? (
                                                    <CheckBoxIcon
                                                        className="status-check-icon checked"
                                                        fontSize="small"
                                                    />
                                                ) : (
                                                    <CheckBoxOutlineBlankIcon
                                                        className="status-check-icon"
                                                        fontSize="small"
                                                    />
                                                )}
                                                <span>{status}</span>
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
                    <div>
                        <h2>Order List</h2>

                        <span>
                            {sortedOrders.length} order
                            {sortedOrders.length !== 1 ? "s" : ""}
                        </span>
                    </div>
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

                                <th>Actions</th>
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

                                        <td className="actions-cell" />
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
