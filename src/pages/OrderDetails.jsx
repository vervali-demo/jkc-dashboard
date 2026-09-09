import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TimelineIcon from "@mui/icons-material/Timeline";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

import StatusBadge from "../components/StatusBadge";
import { orders } from "../data/order";

import "../styles/order-details.css";

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const STATUS_STEPS = ["Placed", "Accepted", "Fulfilled"];

const getActiveMilestoneIndex = (status) => {
  const currentStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (currentStatus === "rejected") {
    return -1;
  }

  if (
    currentStatus === "accepted" ||
    currentStatus === "distributor edit"
  ) {
    return 1;
  }

  if (
    currentStatus === "fulfilled" ||
    currentStatus === "partial fulfilled" ||
    currentStatus === "delivered"
  ) {
    return 2;
  }

  return 0;
};

const OrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const order = orders.find((item) => String(item.id) === String(id));

  const summary = useMemo(() => {
    if (!order) {
      return { subtotal: 0, discount: 0, tax: 0, total: 0 };
    }

    const subtotal = (order.items || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const discount = 0;
    const tax = Math.max(Number(order.amount || 0) - subtotal, 0);
    const total = Number(order.amount || subtotal);

    return { subtotal, discount, tax, total };
  }, [order]);

  if (!order) {
    return (
      <div className="order-details-page">
        <button
          className="back-order-btn"
          onClick={() => navigate("/orders")}
        >
          <ArrowBackIcon fontSize="small" />
          Back to Orders
        </button>

        <div className="order-not-found">
          <h2>Order not found</h2>
          <p>The requested order could not be found.</p>
        </div>
      </div>
    );
  }

  const currentStatus = order.status || order.orderState;
  const activeIndex = getActiveMilestoneIndex(currentStatus);
  const isRejected = activeIndex === -1;

  return (
    <div className="order-details-page">
      <div className="details-top">
        <button
          className="back-order-btn"
          onClick={() => navigate("/orders")}
        >
          <ArrowBackIcon fontSize="small" />
          Back to Orders
        </button>

        <div className="details-breadcrumb">Orders / Order Details</div>
      </div>

      <div className="details-heading">
        <div>
          <div className="details-id">Order #{order.id}</div>
          <h1>{order.outlet}</h1>
          <p>Created on {order.orderDate}</p>
        </div>

        <StatusBadge status={currentStatus} />
      </div>

      <div className="details-layout">
        {/* LEFT COLUMN */}
        <div className="details-main">
          <div className="details-main-row">
            <div className="information-card status-milestone-card">
              <div className="information-card-header">
                <div className="info-icon">
                  <TimelineIcon />
                </div>
                <div>
                  <h3>Order Status</h3>
                  <span>Track progress of this order</span>
                </div>
              </div>

              <div className="status-milestone">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = !isRejected && index <= activeIndex;
                  const isCurrent = !isRejected && index === activeIndex;

                  return (
                    <React.Fragment key={step}>
                      <div
                        className={`milestone-step ${
                          isCompleted ? "completed" : ""
                        } ${isCurrent ? "current" : ""} ${
                          isRejected && index === 0 ? "rejected" : ""
                        }`}
                      >
                        <div className="milestone-dot">
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        <span>{step}</span>
                      </div>

                      {index < STATUS_STEPS.length - 1 && (
                        <div
                          className={`milestone-line ${
                            !isRejected && index < activeIndex
                              ? "completed"
                              : ""
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {isRejected && (
                <div className="milestone-note rejected">
                  This order was rejected.
                </div>
              )}

              {String(currentStatus).toLowerCase() === "partial fulfilled" && (
                <div className="milestone-note">
                  Current status: Partial Fulfilled
                </div>
              )}

              {String(currentStatus).toLowerCase() === "distributor edit" && (
                <div className="milestone-note">
                  Current status: Distributor Edit
                </div>
              )}
            </div>

            <div className="information-card">
              <div className="information-card-header">
                <div className="info-icon">
                  <WarehouseIcon />
                </div>
                <div>
                  <h3>Distributor</h3>
                  <span>Warehouse information</span>
                </div>
              </div>

              <div className="information-fields compact-fields">
                <div>
                  <label>Warehouse / Distributor</label>
                  <strong>{order.distributor}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="details-main-row">
            <div className="information-card">
              <div className="information-card-header">
                <div className="info-icon">
                  <PersonIcon />
                </div>
                <div>
                  <h3>User Information</h3>
                  <span>Order owner details</span>
                </div>
              </div>

              <div className="information-fields compact-fields">
                <div>
                  <label>User</label>
                  <strong>{order.user}</strong>
                </div>
                <div>
                  <label>JCP Outlet</label>
                  <strong>{order.outlet}</strong>
                </div>
                <div>
                  <label>Ship To</label>
                  <strong>{order.shipTo}</strong>
                </div>
              </div>
            </div>

            <div className="information-card">
              <div className="information-card-header">
                <div className="info-icon">
                  <LocationOnIcon />
                </div>
                <div>
                  <h3>Delivery</h3>
                  <span>Delivery information</span>
                </div>
              </div>

              <div className="information-fields compact-fields">
                <div>
                  <label>Ship To</label>
                  <strong>{order.shipTo}</strong>
                </div>
                <div>
                  <label>Comment</label>
                  <strong>{order.comment || "-"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="information-card">
            <div className="information-card-header">
              <div className="info-icon">
                <AccountBalanceWalletIcon />
              </div>
              <div>
                <h3>Order Summary</h3>
                <span>Payment breakdown</span>
              </div>
            </div>

            <div className="order-summary-list">
              <div className="order-summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(summary.subtotal)}</strong>
              </div>
              <div className="order-summary-row">
                <span>Discount</span>
                <strong>{formatCurrency(summary.discount)}</strong>
              </div>
              <div className="order-summary-row">
                <span>Tax (GST)</span>
                <strong>{formatCurrency(summary.tax)}</strong>
              </div>
              <div className="order-summary-row total">
                <span>Grand Total</span>
                <strong>{formatCurrency(summary.total)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="details-sidebar">
          <div className="information-card">
            <div className="information-card-header">
              <div className="info-icon">
                <ReceiptLongIcon />
              </div>
              <div>
                <h3>Order Information</h3>
                <span>Basic order details</span>
              </div>
            </div>

            <div className="information-fields sidebar-fields">
              <div>
                <label>Bizom Order ID</label>
                <strong>{order.id}</strong>
              </div>
              <div>
                <label>Order ERP ID</label>
                <strong>{order.erpId}</strong>
              </div>
              <div>
                <label>Order Date</label>
                <strong>{order.orderDate}</strong>
              </div>
              <div>
                <label>Order State</label>
                <strong>{currentStatus}</strong>
              </div>
            </div>
          </div>

          <div className="information-card sidebar-items-card">
            <div className="information-card-header">
              <div className="info-icon">
                <Inventory2Icon />
              </div>
              <div>
                <h3>Order Items</h3>
                <span>
                  {(order.items || []).length} product
                  {(order.items || []).length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="sidebar-items-table-wrapper desktop-items-table">
              <table className="sidebar-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <strong>{item.product}</strong>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td className="detail-item-amount">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-items-list">
              {(order.items || []).length === 0 ? (
                <div className="mobile-item-card">
                  <p className="mobile-item-empty">No products in this order</p>
                </div>
              ) : (
                (order.items || []).map((item, index) => (
                  <div key={item.id || index} className="mobile-item-card">
                    <div className="mobile-kv-row">
                      <span>Product</span>
                      <strong>{item.product}</strong>
                    </div>
                    <div className="mobile-kv-row">
                      <span>Quantity</span>
                      <strong>{item.quantity}</strong>
                    </div>
                    <div className="mobile-kv-row">
                      <span>Unit Price</span>
                      <strong>{formatCurrency(item.unitPrice)}</strong>
                    </div>
                    <div className="mobile-kv-row">
                      <span>Amount</span>
                      <strong className="mobile-item-amount">
                        {formatCurrency(item.amount)}
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
