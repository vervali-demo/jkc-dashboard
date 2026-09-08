import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import StatusBadge from "../components/StatusBadge";
import { orders } from "../data/order";

import "../styles/order-details.css";


const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};


const OrderDetails = () => {
  const navigate = useNavigate();

  const { id } = useParams();

  const order = orders.find(
    (item) => String(item.id) === String(id)
  );


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

          <p>
            The requested order could not be found.
          </p>
        </div>

      </div>
    );
  }


  return (
    <div className="order-details-page">

      {/* =====================================
          TOP
      ===================================== */}

      <div className="details-top">

        <button
          className="back-order-btn"
          onClick={() => navigate("/orders")}
        >
          <ArrowBackIcon fontSize="small" />
          Back to Orders
        </button>

        <div className="details-breadcrumb">
          Orders / Order Details
        </div>

      </div>


      {/* =====================================
          HEADER
      ===================================== */}

      <div className="details-heading">

        <div>

          <div className="details-id">
            Order #{order.id}
          </div>

          <h1>
            {order.outlet}
          </h1>

          <p>
            Created on {order.orderDate}
          </p>

        </div>

        <StatusBadge
          status={
            order.status ||
            order.orderState
          }
        />

      </div>


      {/* =====================================
          INFORMATION CARDS
      ===================================== */}

      <div className="information-grid">

        {/* ORDER INFORMATION */}

        <div className="information-card">

          <div className="information-card-header">

            <div className="info-icon">
              <ReceiptLongIcon />
            </div>

            <div>
              <h3>Order Information</h3>

              <span>
                Basic order details
              </span>
            </div>

          </div>


          <div className="information-fields">

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
              <strong>
                {order.status ||
                  order.orderState}
              </strong>
            </div>

          </div>

        </div>


        {/* CUSTOMER */}

        <div className="information-card">

          <div className="information-card-header">

            <div className="info-icon">
              <PersonIcon />
            </div>

            <div>
              <h3>User Information</h3>

              <span>
                Order owner details
              </span>
            </div>

          </div>


          <div className="information-fields">

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


        {/* DISTRIBUTOR */}

        <div className="information-card">

          <div className="information-card-header">

            <div className="info-icon">
              <WarehouseIcon />
            </div>

            <div>
              <h3>Distributor</h3>

              <span>
                Warehouse information
              </span>
            </div>

          </div>


          <div className="information-fields">

            <div>
              <label>
                Warehouse / Distributor
              </label>

              <strong>
                {order.distributor}
              </strong>
            </div>

          </div>

        </div>


        {/* DELIVERY */}

        <div className="information-card">

          <div className="information-card-header">

            <div className="info-icon">
              <LocationOnIcon />
            </div>

            <div>
              <h3>Delivery</h3>

              <span>
                Delivery information
              </span>
            </div>

          </div>


          <div className="information-fields">

            <div>
              <label>Ship To</label>

              <strong>
                {order.shipTo}
              </strong>
            </div>

            <div>
              <label>Comment</label>

              <strong>
                {order.comment || "-"}
              </strong>
            </div>

          </div>

        </div>

      </div>


      {/* =====================================
          ITEMS
      ===================================== */}

      <div className="items-detail-card">

        <div className="items-detail-header">

          <div>

            <h2>Order Items</h2>

            <p>
              Products included in this order
            </p>

          </div>

          <span className="item-count-badge">
            {order.items?.length || 0} Items
          </span>

        </div>


        <div className="items-detail-table-wrapper desktop-items-table">

          <table className="items-detail-table">

            <thead>

              <tr>

                <th>PRODUCT</th>

                <th>QUANTITY</th>

                <th>UNIT PRICE</th>

                <th>AMOUNT</th>

              </tr>

            </thead>


            <tbody>

              {order.items?.map(
                (item, index) => (

                  <tr
                    key={
                      item.id || index
                    }
                  >

                    <td>

                      <strong>
                        {item.product}
                      </strong>

                    </td>

                    <td>
                      {item.quantity}
                    </td>

                    <td>
                      {formatCurrency(
                        item.unitPrice
                      )}
                    </td>

                    <td className="detail-item-amount">
                      {formatCurrency(
                        item.amount
                      )}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>


        <div className="mobile-items-list">

          {(order.items || []).length === 0 ? (
            <div className="mobile-item-card">
              <p className="mobile-item-empty">
                No products in this order
              </p>
            </div>
          ) : (
            (order.items || []).map((item, index) => (
              <div
                key={item.id || index}
                className="mobile-item-card"
              >
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
                  <strong>
                    {formatCurrency(item.unitPrice)}
                  </strong>
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


        {/* TOTAL */}

        <div className="order-total-section">

          <div>
            <span>
              Total Items
            </span>

            <strong>
              {order.items?.length || 0}
            </strong>
          </div>


          <div>
            <span>
              Order Total
            </span>

            <strong>
              {formatCurrency(
                order.amount
              )}
            </strong>
          </div>

        </div>

      </div>


      {/* =====================================
          COMMENT
      ===================================== */}

      {order.comment && (

        <div className="comment-card">

          <h3>Order Comment</h3>

          <p>
            {order.comment}
          </p>

        </div>

      )}

    </div>
  );
};

export default OrderDetails;