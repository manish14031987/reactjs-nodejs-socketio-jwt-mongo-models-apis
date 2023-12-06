const Promise = require("bluebird");
var email_service = require("../email/email.services");
const Post = require("../../models/Post");
const Order = require("../../models/Order");
const Setting = require("../../models/Setting");
const Favorite = require("../../models/Favorite");
const Coupon = require("../../models/Coupon");
const CouponUse = require("../../models/CouponUse");
const Recommend = require("../../models/RecentlyView");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const Address = require("../../models/Address");
const OrderRanking = require("../../models/OrderRanking");
const WhereHouse = require("../../models/WhereHouse");
const User = require("../../models/User");
const ChatRoom = require("../../models/ChatRoom");
const ChatMessage = require("../../models/ChatMessage");
const Offer = require("../../models/Offer");
const ReturnRequest = require("../../models/ReturnRequest");
const Card = require("../../models/Card");
const PurchaseBoot = require("../../models/PurchaseBoot");
const OfferHistory = require("../../models/OfferHistory");
var logger = require("../../utils/logger").Logger;
const i18next = require("../../helpers/i18n");

const {
  ucFirst,
  getPostImageUrl,
  sendMail,
  sendMailAttachments,
  getShippingFee,
  getProcessingFee,
  sendPushNotification,
  sendNotification,
  getShippingAgent,
  createZohoTicketNumber,
  time,
  date,
  currentTime,
  padLeadingZeros,
} = require("../../helpers/helpers");
const { setMessage, setSystemMessage } = require("../../helpers/responseData");
const config = require("../../config/config");
const _ = require("lodash");
var moment = require("moment");
const mongoose = require("mongoose");
const { promisify } = require("util");
const fsg = require("fs");
const writeFileAsync = promisify(fsg.writeFile);
const {
  paymentService,
  offerService,
  walletService,
} = require("../../services");

module.exports = {
  /**
   * socket.emit('join-room',"61c2cf2033e0333dc0cd60bc","user_id");
   * @param {*} socket
   * @param {*} room
   * @param {*} io
   */
  joinRoom: async (socket, room, io) => {
    try {
      socket.leaveAll();
      socket.join(room);
      var obj = { api: "join-room", body: { room: room } };
      logger.socketRequest(JSON.stringify(obj));

      const roomData = await ChatRoom.findOne({ _id: room });
      if (roomData) {
        var offerCount = await Offer.countDocuments({
          expired: false,
          room: room,
        });
        const seller = await User.findOne(
          { _id: roomData.seller_id },
          { first_name: 1, last_name: 1, image: 1, rating: 1, totalRating: 1 }
        );
        const buyer = await User.findOne(
          { _id: roomData.user_id },
          { first_name: 1, last_name: 1, image: 1, rating: 1, totalRating: 1 }
        );

        const postData = await Post.findOne({ _id: roomData.post_id });

        roomData.item.meetUp = roomData.item.meetUp ? true : false;
        roomData.item.shipping = roomData.shipping;
        var data = {
          room: room,
          orderCancelButton: roomData.orderCancelButton,
          order_id: roomData.order_id,
          buyNow: postData.buyNow,
          seller: seller,
          buyer: buyer,
          item: roomData.item,
          offerCount: roomData.buyNow || postData.sold ? 1 : offerCount,
        };
        io.sockets.in(room).emit("room-details", data);
      }
    } catch (err) {
      console.log("err ==>", err);
      var obj = { api: "join-room", body: { err: err } };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(room).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('leave-room',"61c2cf2033e0333dc0cd60bc");
   * @param {*} socket
   * @param {*} room
   * @param {*} io
   */
  leaveRoom: async (socket, room, io) => {
    try {
      socket.leaveAll();
    } catch (err) {
      var obj = { api: "join-room", body: { err: err } };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(room).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('join-offer-listing',"61c2cf2033e0333dc0cd60bc");
   * @param {*} socket
   * @param {*} userId
   * @param {*} io
   */
  joinOfferListing: async (socket, userId, io) => {
    try {
      console.log("userId ==>", userId);
      socket.join(userId);
    } catch (err) {
      var obj = { api: "join-offer-listing", body: { err: err } };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(room).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('join-room',"61c2cf2033e0333dc0cd60bc");
   * @param {*} socket
   * @param {*} room
   * @param {*} io
   */
  joinUser: async (socket, userId, io) => {
    try {
      socket.join(userId);
    } catch (err) {
      io.sockets.in(userId).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * @param {*} socket
   */
  disconnect: async (socket) => {
    socket.leaveAll();
    await User.findOne({ socket: socket.id });
    await User.updateOne({ socket: socket.id }, { online: false, socket: "" });
  },
  /**
   * socket.emit('message-listing',"61c2cf2033e0333dc0cd60bc","61c1ae2f57ae2226b42892b9");
   *
   * @param {*} socket
   * @param {*} room
   * @param {*} user_id
   * @param {*} io
   */
  messageListing: async (socket, room, user_id, io) => {
    try {
      var obj = {
        api: "message-listing",
        body: { room: room, user_id: user_id },
      };

      logger.socketRequest(JSON.stringify(obj));
      var language = "en";
      var userData = await User.findOne({ _id: user_id });
      if (userData) {
        language = userData.language;
      }
      await User.updateOne(
        { _id: user_id },
        { online: true, socket: socket.id }
      );
      const roomData = await ChatMessage.find({
        room: room,
        seller_status: { $ne: "CANCELED" },
      });

      /**
       * update notification count
       */
      var offerData = await Offer.findOne({ room: room });

      var meetUpPop = false;
      if (offerData) {
        if (offerData.meetUp && !offerData.paymentType) {
          meetUpPop = true;
        }
      }

      var roomDataList = await ChatRoom.findOne({ _id: room });
      if (roomDataList) {
        if (roomDataList.user_id.toString() === user_id) {
          var updateRequest = {};
          updateRequest.buyerNotificationCount = 0;
          await ChatRoom.updateOne({ _id: room }, updateRequest);
        }
        if (roomDataList.seller_id.toString() === user_id) {
          var updateRequest = {};
          updateRequest.sellerNotificationCount = 0;
          await ChatRoom.updateOne({ _id: room }, updateRequest);
        }
      }

      var data = [];
      await Promise.map(roomData, async (item) => {
        var obj = {};
        obj._id = item._id;
        obj.message = setMessage(item.message, "en");
        obj.systemMessage = setSystemMessage(item.systemMessage, "en");
        obj.message_arabic = setMessage(item.message, "ar");
        obj.systemMessage_arabic = setSystemMessage(item.systemMessage, "ar");
        obj.seller_status = item.seller_status;
        obj.buyer_status = item.buyer_status;
        obj.item = item.item;
        obj.type = item.type;
        obj.meetUpPop = meetUpPop;
        obj.isCard = item.isCard;
        obj.offerCancel = item.offerCancel;
        obj.item.paymentType = roomData.paymentType;
        obj.sender = item.sender;
        obj.receiver = item.receiver;
        obj.date = date(item.created_at);
        obj.time = time(item.created_at);
        data.push(obj);
      });

      io.sockets.in(room).emit("chat-details", data);
    } catch (err) {
      var obj = {
        api: "message-listing",
        err: err,
      };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(user_id).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * @param {*} socket
   * @param {*} userId
   * @param {*} io
   * @returns
   */
  buyerChatList: async (socket, userId, page, io) => {
    try {
      socket.join(userId);
      var query = { $or: [{ user_id: userId }, { seller_id: userId }] };
      const options = {
        page: page || 1,
        limit: 20,
        sort: { lastDate: -1 },
      };
      const chatList = await ChatRoom.paginate(query, options);
      var data = [];

      var userData = await User.findOne({ _id: userId });
      var language = "en";
      if (userData) {
        language = userData.language;
      }

      /**
       * Buyer chat listing
       */

      for (let index = 0; index < chatList.docs.length; index++) {
        const item = chatList.docs[index];
        var obj = {};
        if (item.user_id.toString() === userId) {
          const seller = await User.findOne(
            { _id: item.seller_id },
            { first_name: 1, last_name: 1, image: 1 }
          );
          obj.name = `${ucFirst(seller.first_name)} ${ucFirst(
            seller.last_name
          )}`;
          obj.image = seller.image;

          obj.message = setMessage(item.lastMessage, language);
          obj.notificationCount = item.buyerNotificationCount;
        }
        if (item.seller_id.toString() === userId) {
          const userData = await User.findOne(
            { _id: item.user_id },
            { first_name: 1, last_name: 1, image: 1 }
          );
          if (userData) {
            obj.name = `${ucFirst(userData.first_name)} ${ucFirst(
              userData.last_name
            )}`;
            obj.image = userData.image;
          } else {
            obj.name = "";
            obj.image = "";
          }
          obj.message = setMessage(item.lastMessageSeller, language);
          obj.notificationCount = item.sellerNotificationCount;
        }
        obj.room = item._id;
        obj.itemImage = item.item.image;
        obj.time = moment(item.lastDate).format("hh:mm A");
        data.push(obj);
      }
      io.sockets.in(userId).emit("buyerChatList", {
        data: data,
        paginate: {
          totalDocs: chatList.totalDocs,
          limit: chatList.limit,
          totalPages: chatList.totalPages,
          hasPrevPage: chatList.hasPrevPage,
          hasNextPage: chatList.hasNextPage,
          prevPage: chatList.prevPage ? chatList.prevPage : 0,
          nextPage: chatList.nextPage ? chatList.nextPage : 0,
        },
      });
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('send-message',"61c2cf2033e0333dc0cd60bc",{"user_id":"61b07123433320116ccbe8a7","room_id":"61c2cf2033e0333dc0cd60bc","message":input.value});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   */
  sendMessage: async (room, io, data, socket) => {
    try {
      var obj = { api: "send-message", body: data };
      var userId = data.user_id;
      socket.join(userId);
      logger.socketRequest(JSON.stringify(obj));
      const roomData = await ChatRoom.findOne({ _id: room });
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = false;

      var setting = await Setting.findOne({}, { restrict_words: 1 });
      if (setting.restrict_words) {
        var restrict_words = false;
        setting.restrict_words.forEach(function (element) {
          var messageString = data.message.toLowerCase();
          var string = element.toLowerCase();
          if (messageString.includes(string)) {
            restrict_words = true;
          }
        });
        if (restrict_words) {
          io.sockets.in(userId).emit("error", { message: "RESTRICT_WORDS" });
          return false;
        }
      }

      if (roomData.user_id.toString() === data.user_id) {
        chatMessageRequest.sender = data.user_id;
        chatMessageRequest.receiver = roomData.seller_id;
      }
      if (roomData.seller_id.toString() === data.user_id) {
        chatMessageRequest.sender = data.user_id;
        chatMessageRequest.receiver = roomData.user_id;
      }

      chatMessageRequest.room = roomData._id;
      chatMessageRequest.status = false;
      chatMessageRequest.item = {};
      chatMessageRequest.message = ucFirst(data.message);
      var lastMessage = await chatMessageRequest.save();

      updateMessage(socket, io, roomData, data);

      const roomDataList = await ChatMessage.findOne({ _id: lastMessage._id });
      var itemData = [];
      var data = {};

      data.message = setMessage(roomDataList.message, "en");
      data.systemMessage = setSystemMessage(roomDataList.systemMessage, "en");
      data.message_arabic = setMessage(roomDataList.message, "ar");
      data.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      data._id = roomDataList._id;
      data.seller_status = roomDataList.seller_status;
      data.buyer_status = roomDataList.buyer_status;
      data.item = roomDataList.item;
      data.type = roomDataList.type;
      data.isCard = roomDataList.isCard;
      data.offerCancel = roomDataList.offerCancel;
      data.sender = roomDataList.sender;
      data.receiver = roomDataList.receiver;
      data.offerCancel = roomDataList.offerCancel;
      data.date = date(roomDataList.created_at);
      data.time = time(roomDataList.created_at);
      itemData.push(data);
      io.sockets.in(room).emit("messageDetails", itemData);
    } catch (err) {
      var obj = { api: "send-message", err: err };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(room).emit("error", { message: err });
      return false;
    }
  },
  /**
   *  socket.emit('send-counter-offer',"61c2cf2033e0333dc0cd60bc",{"post_id":"61c05fe40b60f30b571b3ab7","amount":200,"paymentType":"ONLINE","room_id":"61c2cf2033e0333dc0cd60bc","paymentId":"123456","cardId"=>"123","language":"en","user_id":"61a9d833b0010b662c7a4cbe"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  sendCounterOffer: async (room, io, data, socket) => {
    var language = data.language;
    var requestData = data;
    var roomSocketId = room;
    socket.join(requestData.user_id);
    var obj = { api: "send-counter-offer", body: { room: room, data: data } };
    const { useWallet, user_id } = data;

    logger.socketRequest(JSON.stringify(obj));
    try {
      var roomData = await ChatRoom.findOne({ _id: room });
      var lastMessageSeller = "OFFER_RECEIVED";
      var shippingFees = 0;
      var lastMessage = "OFFER_SEND";
      if (roomData.user_id.toString() === requestData.user_id) {
        var lastMessageSeller = "OFFER_RECEIVED";
        var lastMessage = "OFFER_SEND";
        await updateOfferListing(socket, io, roomData.seller_id);
      }
      if (roomData.seller_id.toString() === requestData.user_id) {
        var lastMessage = "OFFER_RECEIVED";
        var lastMessageSeller = "OFFER_SEND";
        await updateOfferListing(socket, io, roomData.user_id);
      }
      await updateMessageCard(
        socket,
        io,
        roomData,
        data,
        lastMessageSeller,
        lastMessage
      );
      await Offer.updateOne({ room: roomSocketId }, { expired: false });
      if (requestData.paymentType) {
        var paymentObj = roomData.item;
        paymentObj.paymentType = requestData.paymentType;
        paymentObj.payment_type = requestData.paymentType;
        await Offer.updateOne(
          { room: roomSocketId },
          {
            paymentId: requestData.paymentId,
            paymentType: requestData.paymentType,
          }
        );
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { paymentType: requestData.paymentType, item: paymentObj }
        );
      }
      await ChatRoom.updateOne({ _id: roomSocketId }, { expired: false });
      if (requestData.cardId) {
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { cardId: requestData.cardId }
        );
      }
      roomData = await ChatRoom.findOne({ _id: room });
      var discount = 0;
      if (roomData.coupon && roomData.coupon._id) {
        var discountAmount = parseFloat(
          parseFloat(requestData.amount).toFixed(2)
        );
        var couponData = roomData.coupon;
        if (couponData.discountType === "Percentage") {
          discount = parseFloat(
            parseFloat(
              ((couponData.percentage / 100) * discountAmount).toFixed(2)
            )
          );
        } else {
          discount = parseFloat(parseFloat(couponData.amount.toFixed(2)));
        }
      }
      if (roomData.shipping) {
        var address = roomData.address;
      } else {
        var address = {};
      }
      const post = await Post.findOne({ _id: data.post_id });
      if (!post) {
        io.sockets.in(requestData.user_id).emit("error", {
          message: setMessage("POST_DATA_NOT_FOUND", language),
        });
        return false;
      }
      if (post.sold) {
        io.sockets.in(requestData.user_id).emit("error", {
          message: setMessage("POST_SOLD", language),
        });
        return false;
      }
      await Post.updateOne(
        { _id: post._id },
        { lastDate: moment().toISOString() }
      );
      var findOrder = await Order.findOne({
        "item._id": post._id,
        status: { $ne: "CANCELED" },
      });
      if (findOrder) {
        io.sockets.in(requestData.user_id).emit("error", {
          message: setMessage("OFFER_ACCEPT_OTHER", language),
        });
        return false;
      }

      /**
       * Send notification
       */
      if (roomData.user_id.toString() === requestData.user_id) {
        var sellerNotification = await User.findOne({
          _id: roomData.seller_id,
        });
      }
      if (roomData.seller_id.toString() === requestData.user_id) {
        var sellerNotification = await User.findOne({
          _id: roomData.user_id,
        });
      }
      var title = setMessage("NEW_OFFER", sellerNotification.language);
      var request = {};
      request.user = sellerNotification;
      request.message = "";
      request.title = title;
      request.type = "CHAT";
      request.roomId = roomData._id;
      request.isMail = true;
      request.orderId = "";
      var t = i18next.t;
      i18next.changeLanguage(sellerNotification.language);
      var itemName = post.title;
      var amount = requestData.amount;
      request.message = t("SEND_OFFER_SELLER", { amount, itemName });
      sendNotification(request);

      var match = {
        _id: new mongoose.Types.ObjectId(data.post_id),
        archive: false,
      };
      Post.aggregate(
        [
          {
            $lookup: {
              from: "addresses",
              localField: "shipping_id",
              foreignField: "_id",
              as: "addresses",
            },
          },
          {
            $unwind: {
              path: "$addresses",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "postimages",
              localField: "_id",
              foreignField: "post_id",
              as: "postimages",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categories",
            },
          },
          {
            $unwind: {
              path: "$categories",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "conditions",
              localField: "condition",
              foreignField: "_id",
              as: "conditions",
            },
          },
          { $unwind: "$conditions" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              created_at: 1,
              title: 1,
              price: 1,
              description: 1,
              who_pay: 1,
              item_information: 1,
              "categories.translate": {
                $filter: {
                  input: "$categories.translate",
                  as: "item",
                  cond: { $eq: ["$$item.language", language] },
                },
              },
              "conditions.translate": {
                $filter: {
                  input: "$conditions.translate",
                  as: "item",
                  cond: { $eq: ["$$item.language", language] },
                },
              },
              postimages: {
                $filter: {
                  input: "$postimages",
                  as: "postimages",
                  cond: { $eq: ["$$postimages.index", 1] },
                },
              },
              payment_type: 1,
              shipping: 1,
              meetUp: 1,
              addresses: 1,
              shipping_address: 1,
            },
          },
        ],
        async function (err, result) {
          if (err) {
            io.sockets.in(roomSocketId).emit("error", { message: err });
            return false;
          } else {
            var obj = roomData.item;
            obj.price = parseFloat(parseFloat(requestData.amount).toFixed(2));
            obj.item_price = parseFloat(parseFloat(post.price).toFixed(2));
            obj.shipping_fee = parseFloat(parseFloat(0).toFixed(2));
            obj.processing_fee = parseFloat(parseFloat(0).toFixed(2));
            obj.discount = parseFloat(parseFloat(discount).toFixed(2));
            obj.who_pay = post.who_pay;

            if (obj.addresses) {
              if (roomData.item.shipping) {
                var originAddress = {
                  Line1: `${obj.addresses.apartment_name} ${obj.addresses.street_name}`,
                  Line2: `${obj.addresses.district}`,
                  Line3: "",
                  City: obj.addresses.city,
                  PostCode: obj.addresses.postal_code,
                };

                var destinationAddress = {
                  Line1: `${address.apartment_name} ${address.street_name}`,
                  Line2: `${address.district}`,
                  Line3: "",
                  City: address.city,
                  PostCode: address.postal_code,
                };

                obj.shipping_fee = await getShippingFee(
                  post.item_information,
                  destinationAddress,
                  originAddress
                );
                shippingFees = obj.shipping_fee;
              }
            } else {
              obj.shipping_fee = 0;
            }

            if (obj.who_pay === "Seller") {
              obj.processing_fee = await getProcessingFee(obj.price);
            } else {
              obj.processing_fee = await getProcessingFee(obj.price);
            }

            obj.seller_shipping_fee = 0;
            obj.buyer_shipping_fee = 0;

            /**
             * Find seller payout
             */
            var setting = await Setting.findOne();
            obj.serviceFees = parseFloat(
              ((setting.admin_commission / 100) * obj.price).toFixed(2)
            );
            obj.serviceFees = roomData.item.meetUp ? 0 : obj.serviceFees;
            if (
              roomData.paymentType === "CASH" ||
              roomData.paymentType === "WALLET"
            ) {
              obj.serviceFees = 0;
            }

            if (!roomData.paymentType) {
              obj.serviceFees = 0;
            }

            if (post.who_pay === "Seller") {
              obj.seller_shipping_fee = shippingFees;
              obj.sellerPayout = parseFloat(
                parseFloat(
                  obj.price -
                    shippingFees -
                    obj.processing_fee -
                    obj.serviceFees
                ).toFixed(2)
              );
            } else {
              obj.buyer_shipping_fee = shippingFees;
              obj.sellerPayout = parseFloat(
                parseFloat(
                  obj.price - obj.processing_fee - obj.serviceFees
                ).toFixed(2)
              );
            }

            if (post.who_pay === "Seller") {
              obj.total = parseFloat(
                parseFloat(obj.price - obj.discount).toFixed(2)
              );
            } else {
              obj.total = parseFloat(
                parseFloat(obj.price + obj.shipping_fee - obj.discount).toFixed(
                  2
                )
              );
            }
            if (useWallet === "true") {
              var walletAmount = await walletService.getAmount({
                user_id: user_id,
              });

              if (walletAmount > obj.total) {
                if (post.who_pay === "Seller") {
                  obj.total = parseFloat(
                    parseFloat(obj.price - obj.discount).toFixed(2)
                  );
                } else {
                  obj.total = parseFloat(
                    parseFloat(
                      obj.price + obj.shipping_fee - obj.discount
                    ).toFixed(2)
                  );
                }

                if (post.who_pay === "Seller") {
                  obj.seller_shipping_fee = shippingFees;
                  obj.sellerPayout = parseFloat(
                    parseFloat(
                      obj.price -
                        shippingFees -
                        obj.processing_fee -
                        obj.serviceFees
                    ).toFixed(2)
                  );
                } else {
                  obj.buyer_shipping_fee = shippingFees;
                  obj.sellerPayout = parseFloat(
                    parseFloat(
                      obj.price - obj.processing_fee - obj.serviceFees
                    ).toFixed(2)
                  );
                }
              }
            }

            /**
             * Update chat item on room
             */
            await ChatRoom.updateOne({ _id: room }, { item: obj });

            /**
             * Submit offer
             */
            var findOffer = await Offer.findOne(
              {
                $or: [
                  { user_id: requestData.user_id },
                  { seller_id: requestData.user_id },
                ],
                post_id: requestData.post_id,
              },
              { _id: 1 }
            );

            if (findOffer) {
              var updateRequest = {};
              updateRequest.status = "OFFER_SENT";
              updateRequest.price = parseFloat(
                parseFloat(requestData.amount).toFixed(2)
              );
              updateRequest.item = obj;
              if (roomData.user_id.toString() === requestData.user_id) {
                updateRequest.offer_by = "USER";
              }
              if (roomData.seller_id.toString() === requestData.user_id) {
                updateRequest.offer_by = "SELLER";
              }

              if (useWallet === "true") {
                updateRequest.walletUse = true;

                if (walletAmount > obj.total) {
                  updateRequest.wallet_amount = obj.total;
                } else {
                  updateRequest.wallet_amount = walletAmount;
                }

                /**
                 * Update on wallet
                 */

                await walletService.blockAmountRecord({
                  user_id: user_id,
                  post_id: post._id,
                  amount: updateRequest.wallet_amount,
                });
              }
              await Offer.updateOne({ room: room }, updateRequest);

              /**
               * Submit offer history
               */
              var paymentType = requestData.paymentType;
              if (useWallet === "true") {
                if (walletAmount > obj.total) {
                  paymentType = "WALLET";
                  offerRequest.wallet_amount = obj.total;
                } else {
                  paymentType = "WALLET-CARD";
                }
              }

              var offerHistory = new OfferHistory();
              offerHistory.user_id = requestData.user_id;
              offerHistory.offer_id = findOffer._id;
              offerHistory.paymentType = paymentType;
              offerHistory.paymentId = requestData.paymentId;
              offerHistory.price = parseFloat(
                parseFloat(requestData.amount - discount).toFixed(2)
              );
              offerHistory.discount = parseFloat(
                parseFloat(discount).toFixed(2)
              );
              offerHistory.item = obj;
              if (roomData.user_id.toString() === requestData.user_id) {
                offerHistory.userType = "BUYER";
              }
              if (roomData.seller_id.toString() === requestData.user_id) {
                offerHistory.userType = "SELLER";
              }
              offerHistory.save();
            } else {
              var offerRequest = new Offer();
              offerRequest.user_id = roomData.user_id;
              offerRequest.seller_id = roomData.seller;
              offerRequest.post_id = roomData.post_id;
              //offerHistory.paymentType = requestData.paymentType;
              //offerHistory.paymentId = requestData.paymentId;
              offerRequest.room = roomData._id;
              offerRequest.price = parseFloat(
                parseFloat(requestData.amount).toFixed(2)
              );
              if (roomData.user_id.toString() === requestData.user_id) {
                offerRequest.offer_by = "USER";
              }
              if (roomData.seller_id.toString() === requestData.user_id) {
                offerRequest.offer_by = "SELLER";
              }
              offerRequest.item = obj;

              if (useWallet === "true") {
                offerRequest.walletUse = true;
                if (walletAmount > obj.total) {
                  offerRequest.wallet_amount = obj.total;
                } else {
                  offerRequest.wallet_amount = walletAmount;
                }

                /**
                 * Update on wallet
                 */

                await walletService.blockAmountRecord({
                  user_id: user_id,
                  post_id: post._id,
                  amount: offerRequest.wallet_amount,
                });
              }

              const offerSave = await offerRequest.save();

              /**
               * Submit offer history
               */
              var offerHistory = new OfferHistory();
              offerHistory.is_offer = true;
              offerHistory.user_id = requestData.user_id;
              offerHistory.offer_id = offerSave._id;
              offerHistory.price = parseFloat(
                parseFloat(requestData.amount - discount).toFixed(2)
              );
              offerHistory.item = obj;
              if (roomData.user_id.toString() === requestData.user_id) {
                offerHistory.userType = "BUYER";
              }
              if (roomData.seller_id.toString() === requestData.user_id) {
                offerHistory.userType = "SELLER";
              }
              offerHistory.save();
            }

            /**
             * Update offer
             */
            await ChatMessage.updateMany(
              {
                room: roomData._id,
                itemData: true,
              },
              { seller_status: "CANCELED", buyer_status: "CANCELED" }
            );

            /**
             * Create chat history
             */
            var chatMessageRequest = new ChatMessage();
            chatMessageRequest.is_offer = true;
            chatMessageRequest.isCard = true;
            if (roomData.user_id.toString() === requestData.user_id) {
              chatMessageRequest.sender = requestData.user_id;
              chatMessageRequest.receiver = roomData.seller_id;
            }

            if (roomData.seller_id.toString() === requestData.user_id) {
              chatMessageRequest.sender = requestData.user_id;
              chatMessageRequest.receiver = roomData.user_id;
            }
            chatMessageRequest.room = roomData._id;
            chatMessageRequest.item = obj;
            chatMessageRequest.itemData = true;
            chatMessageRequest.status = false;

            if (roomData.user_id.toString() === requestData.user_id) {
              chatMessageRequest.seller_status = "RECEIVED_OFFER";
              chatMessageRequest.buyer_status = "SEND_OFFER";
            }
            if (roomData.seller_id.toString() === requestData.user_id) {
              chatMessageRequest.seller_status = "SEND_OFFER";
              chatMessageRequest.buyer_status = "RECEIVED_OFFER";
            }
            chatMessageRequest.lastDate = moment().toISOString();
            await chatMessageRequest.save();

            io.sockets.in(requestData.user_id).emit("error", {
              message: setMessage("OFFER_SAVE", language),
            });

            const roomDataArray = await ChatMessage.find({
              room: roomData._id,
              seller_status: { $ne: "CANCELED" },
            });

            var itemData = [];
            await Promise.map(roomDataArray, async (item) => {
              var obj = {};
              obj._id = item._id;
              obj.message = setMessage(item.message, "en");
              obj.systemMessage = setSystemMessage(item.systemMessage, "en");
              obj.message_arabic = setMessage(item.message, "ar");
              obj.systemMessage_arabic = setSystemMessage(
                item.systemMessage,
                "ar"
              );
              obj.seller_status = item.seller_status;
              obj.buyer_status = item.buyer_status;
              obj.item = item.item;
              obj.type = item.type;
              obj.isCard = item.isCard;
              obj.offerCancel = item.offerCancel;
              obj.item.paymentType = item.paymentType;
              obj.sender = item.sender;
              obj.receiver = item.receiver;
              obj.date = date(item.created_at);
              obj.time = time(item.created_at);
              itemData.push(obj);
            });
            io.sockets.in(roomSocketId).emit("chat-details", itemData);
          }
        }
      );
    } catch (err) {
      console.log(err);
      var obj = { api: "send-counter-offer", error: err };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(requestData.user_id).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('send-offer',"61c2cf2033e0333dc0cd60bc",{"post_id":"61c1b40e809d042e70acad23","address_id":"61bc74d7a35d642b90093bb9","code":"","shipping":true,"meetUp":false,"amount":80,"paymentType":"ONLINE","room_id":"61c2cf2033e0333dc0cd60bc","paymentId":"2202514473204887200","cardId":"2202514473204887200","language":"en","user_id":"6191fdf9cfe6593c7c296c44"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  sendOffer: async (room, io, data, socket) => {
    var roomSocketId = room;
    var obj = { api: "send-offer", body: { room: room, data: data } };
    logger.socketRequest(JSON.stringify(obj));

    try {
      var {
        post_id,
        amount,
        code,
        address_id,
        shipping,
        meetUp,
        paymentType,
        room_id,
        language,
        paymentId,
        user_id,
        cardId,
        useWallet,
      } = data;

      if (shipping) {
        paymentType = "ONLINE";
      }
      var requestData = data;
      var shippingFees = 0;
      socket.join(user_id);
      const post = await Post.findOne(
        { _id: post_id },
        { price: 1, offer: 1, user_id: 1, who_pay: 1, postNumber: 1 }
      );
      if (!post) {
        io.sockets.in(user_id).emit("error", {
          message: setMessage("POST_DATA_NOT_FOUND", language),
        });
        return false;
      }
      if (post.sold) {
        io.sockets.in(user_id).emit("error", {
          message: setMessage("POST_SOLD", language),
        });
        return false;
      }
      await Post.updateOne(
        { _id: post._id },
        { lastDate: moment().toISOString() }
      );

      var findOrder = await Order.findOne({
        "item._id": post._id,
        status: { $ne: "CANCELED" },
      });

      if (findOrder) {
        io.sockets.in(user_id).emit("error", {
          message: setMessage("OFFER_ACCEPT_OTHER", language),
        });
        return false;
      }

      var match = {
        _id: new mongoose.Types.ObjectId(post_id),
        archive: false,
      };

      var itemShipping = false;
      var itemMeetUp = false;
      try {
        var result = await Post.aggregate([
          {
            $lookup: {
              from: "postimages",
              localField: "_id",
              foreignField: "post_id",
              as: "postimages",
            },
          },
          {
            $lookup: {
              from: "addresses",
              localField: "shipping_id",
              foreignField: "_id",
              as: "addresses",
            },
          },
          {
            $unwind: {
              path: "$addresses",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categories",
            },
          },
          {
            $unwind: {
              path: "$categories",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "conditions",
              localField: "condition",
              foreignField: "_id",
              as: "conditions",
            },
          },
          { $unwind: "$conditions" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              created_at: 1,
              price: 1,
              title: 1,
              who_pay: 1,
              description: 1,
              item_information: 1,
              meetUp: 1,
              shipping: 1,
              "categories.translate": {
                $filter: {
                  input: "$categories.translate",
                  as: "item",
                  cond: { $eq: ["$$item.language", language] },
                },
              },
              "conditions.translate": {
                $filter: {
                  input: "$conditions.translate",
                  as: "item",
                  cond: { $eq: ["$$item.language", language] },
                },
              },
              postimages: {
                $filter: {
                  input: "$postimages",
                  as: "postimages",
                  cond: { $eq: ["$$postimages.index", 1] },
                },
              },
              payment_type: 1,
              addresses: 1,
              shipping_address: 1,
            },
          },
        ]);
        var obj = {};
        obj.discount = 0;

        await Promise.map(result, async (item) => {
          itemShipping = item.shipping;
          itemMeetUp = item.meetUp;

          obj._id = item._id;
          obj.meetUp = item.meetUp;
          obj.shipping = item.shipping;
          obj.who_pay = item.who_pay;
          obj.title = ucFirst(item.title);
          obj.description = item.description;
          obj.item_price = parseFloat(parseFloat(item.price).toFixed(2));
          obj.price = parseFloat(parseFloat(amount).toFixed(2));
          obj.payment_type = paymentType;
          obj.categories = item.categories.translate
            ? ucFirst(item.categories.translate[0].title)
            : "";
          obj.conditions = ucFirst(item.conditions.translate[0].title);
          obj.item_information = item.item_information;
          obj.addresses = item.shipping_address;
          obj.image =
            item.postimages.length > 0
              ? await getPostImageUrl(item.postimages[0].title)
              : await getPostImageUrl("image.png");
        });

        if (shipping) {
          obj.shipping_fee = config.SHIPPING_FEE;
          obj.processing_fee = config.PROCESSING_FEE;
        } else {
          obj.shipping_fee = 0;
        }

        if (shipping) {
          if (address_id) {
            var address = await Address.findOne({ _id: address_id });
          } else {
            var address = await Address.findOne({
              user_id: user_id,
              is_default: true,
            });
          }
        } else {
          var address = {};
        }

        if (!address) {
          io.sockets.in(user_id).emit("error", {
            message: setMessage("ADDRESS_NOT_ADDED", language),
          });
          return false;
        }
        if (obj.addresses) {
          if (shipping) {
            var originAddress = {
              Line1: `${obj.addresses.apartment_name} ${obj.addresses.street_name}`,
              Line2: `${obj.addresses.district}`,
              Line3: "",
              City: obj.addresses.city,
              PostCode: obj.addresses.postal_code,
            };
            var destinationAddress = {
              Line1: `${address.apartment_name} ${address.street_name}`,
              Line2: `${address.district}`,
              Line3: "",
              City: address.city,
              PostCode: address.postal_code,
            };
            obj.shipping_fee = await getShippingFee(
              obj.item_information,
              destinationAddress,
              originAddress
            );
          }
        } else {
          obj.shipping_fee = 21;
        }
        shippingFees = obj.shipping_fee;

        if (obj.who_pay === "Seller") {
          obj.processing_fee = await getProcessingFee(obj.price);
        } else {
          obj.processing_fee = await getProcessingFee(obj.price);
        }

        if (useWallet === "true") {
          if (walletAmount > obj.total) {
            paymentType = "WALLET";
            offerRequest.wallet_amount = obj.total;
          } else {
            paymentType = "WALLET-CARD";
          }
        }

        obj.paymentMethod = paymentType;
        obj.shipping = shipping;
        obj.meetUp = meetUp;
        obj.seller_shipping_fee = 0;
        obj.buyer_shipping_fee = 0;

        /**
         * Submit offer
         */
        var findOffer = await Offer.findOne(
          {
            $or: [{ user_id: user_id }, { seller_id: user_id }],
            post_id: post._id,
          },
          { _id: 1, expired: 1 }
        );
        if (room_id) {
          var roomDataOffer = await ChatRoom.findOne({
            _id: room_id,
          });
          findOffer = await Offer.findOne(
            {
              user_id: roomDataOffer.user_id,
              seller_id: roomDataOffer.seller_id,
              post_id: post._id,
            },
            { _id: 1, expired: 1 }
          );
        }

        if (findOffer && !findOffer.expired) {
          io.sockets.in(user_id).emit("error", {
            message: setMessage("OFFER_SUBMITTED", language),
          });
          return false;
        }
        var coupon = {};
        if (code) {
          const couponData = await Coupon.findOne(
            {
              //couponType: "Coupon",
              code: code,
              to: { $gte: moment().toISOString() },
              limit: { $ne: 0 },
            },
            { discountType: 1, percentage: 1, amount: 1, usage_limit: 1 }
          );
          if (couponData) {
            coupon = couponData;
            var discountAmount = parseFloat(parseFloat(amount).toFixed(2));
            if (couponData.discountType === "Percentage") {
              obj.discount = parseFloat(
                parseFloat(
                  ((couponData.percentage / 100) * discountAmount).toFixed(2)
                )
              );
            } else {
              obj.discount = parseFloat(
                parseFloat(couponData.amount.toFixed(2))
              );
            }

            /**
             * Save coupon use
             */
            var couponUse = new CouponUse();
            couponUse.user_id = user_id;
            couponUse.coupon_id = couponData._id;
            couponUse.save();

            /**
             * Update use limit
             */

            await Coupon.updateOne(
              { _id: couponData._id },
              { usage_limit: couponData.usage_limit - 1 }
            );
          }
        }

        /**
         * Find seller payout
         */
        var setting = await Setting.findOne();
        obj.serviceFees = parseFloat(
          ((setting.admin_commission / 100) * obj.price).toFixed(2)
        );

        obj.serviceFees = meetUp ? 0 : obj.serviceFees;

        if (post.who_pay === "Seller") {
          obj.seller_shipping_fee = shippingFees;
          obj.sellerPayout = parseFloat(
            parseFloat(
              obj.price - shippingFees - obj.processing_fee - obj.serviceFees
            ).toFixed(2)
          );
        } else {
          obj.buyer_shipping_fee = shippingFees;
          obj.sellerPayout = parseFloat(
            parseFloat(
              obj.price - obj.processing_fee - obj.serviceFees
            ).toFixed(2)
          );
        }

        if (post.who_pay === "Seller") {
          obj.total = parseFloat(
            parseFloat(obj.price - obj.discount).toFixed(2)
          );
        } else {
          obj.total = parseFloat(
            parseFloat(obj.price + obj.shipping_fee - obj.discount).toFixed(2)
          );
        }

        if (useWallet === "true") {
          var walletAmount = await walletService.getAmount({
            user_id: user_id,
          });

          if (walletAmount > obj.total) {
            if (post.who_pay === "Seller") {
              obj.total = parseFloat(
                parseFloat(obj.price - obj.discount).toFixed(2)
              );
            } else {
              obj.total = parseFloat(
                parseFloat(obj.price + obj.shipping_fee - obj.discount).toFixed(
                  2
                )
              );
            }
            if (post.who_pay === "Seller") {
              obj.seller_shipping_fee = shippingFees;
              obj.sellerPayout = parseFloat(
                parseFloat(
                  obj.price - shippingFees - obj.discount - obj.serviceFees
                ).toFixed(2)
              );
            } else {
              obj.buyer_shipping_fee = shippingFees;
              obj.sellerPayout = parseFloat(
                parseFloat(obj.price - obj.discount - obj.serviceFees).toFixed(
                  2
                )
              );
            }
          }
        }

        /**
         * Create Chat room
         */
        var buyer = await User.findOne(
          { _id: user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        var seller = await User.findOne(
          { _id: post.user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );

        var chatRoom = {};
        if (room_id) {
          chatRoom = await ChatRoom.findOne({
            _id: room_id,
          });
        } else {
          chatRoom = await ChatRoom.findOne({
            user_id: user_id,
            seller_id: post.user_id,
            post_id: post._id,
          });
        }

        if (chatRoom) {
          room = chatRoom._id;
          var updateRequest = {};
          updateRequest.time = currentTime();
          updateRequest.sellerNotificationCount =
            chatRoom.sellerNotificationCount + 1;
          updateRequest.shipping = itemShipping;
          updateRequest.meetUp = itemMeetUp;
          updateRequest.post_id = post._id;
          updateRequest.item = obj;
          if (cardId) {
            updateRequest.cardId = cardId;
          }
          //updateRequest.buyer = buyer;
          //updateRequest.seller = seller;
          updateRequest.address = address;
          updateRequest.coupon = coupon;
          updateRequest.paymentType = paymentType;
          updateRequest.paymentId = paymentId;
          updateRequest.lastDate = moment().toISOString();
          await ChatRoom.updateOne({ _id: room }, updateRequest);
        } else {
          var chatRequest = new ChatRoom();
          chatRequest.user_id = user_id;
          chatRequest.seller_id = post.user_id;
          chatRequest.shipping = itemShipping;
          chatRequest.meetUp = itemMeetUp;
          chatRequest.post_id = post._id;
          if (cardId) {
            chatRequest.cardId = cardId;
          }
          chatRequest.item = obj;
          chatRequest.buyer = buyer;
          chatRequest.seller = seller;
          chatRequest.address = address;
          chatRequest.coupon = coupon;
          chatRequest.paymentType = paymentType;
          chatRequest.paymentId = paymentId;
          chatRequest.time = currentTime();
          chatRequest.lastDate = moment().toISOString();
          var roomSave = await chatRequest.save();
          chatRoom = await ChatRoom.findOne({ _id: roomSave._id });
          room = chatRoom._id;
        }

        /**
         * update lsat message
         */
        const roomDataItem = await ChatRoom.findOne({ _id: room });

        /**
         * Send offer notification
         */
        if (roomDataItem.user_id.toString() === requestData.user_id) {
          var sellerNotification = await User.findOne({
            _id: roomDataItem.seller_id,
          });
        }
        if (roomDataItem.seller_id.toString() === requestData.user_id) {
          var sellerNotification = await User.findOne({
            _id: roomDataItem.user_id,
          });
        }
        var title = setMessage("NEW_OFFER", sellerNotification.language);
        var request = {};
        request.user = sellerNotification;
        request.message = "";
        request.title = title;
        request.type = "CHAT";
        request.roomId = roomDataItem._id;
        request.isMail = true;
        request.orderId = "";

        var t = i18next.t;
        i18next.changeLanguage(sellerNotification.language);
        var itemName = post.title;
        request.message = t("SEND_OFFER_SELLER", { amount, itemName });
        sendNotification(request);

        if (roomDataItem.user_id.toString() === requestData.user_id) {
          var lastMessageSeller = "OFFER_RECEIVED";
          var lastMessage = "OFFER_SEND";
          await updateOfferListing(socket, io, roomDataItem.seller_id);
        }
        if (roomDataItem.seller_id.toString() === requestData.user_id) {
          var lastMessage = "OFFER_RECEIVED";
          var lastMessageSeller = "OFFER_SEND";
          await updateOfferListing(socket, io, roomDataItem.user_id);
        }

        await updateMessageCard(
          socket,
          io,
          roomDataItem,
          requestData,
          lastMessageSeller,
          lastMessage
        );

        if (findOffer) {
          var offerRequest = {};
          if (chatRoom) {
            offerRequest.user_id = chatRoom.user_id;
            offerRequest.seller_id = chatRoom.seller_id;
          } else {
            offerRequest.user_id = user_id;
            offerRequest.seller_id = post.user_id;
          }

          offerRequest.post_id = post._id;
          offerRequest.room = room;
          offerRequest.price = parseFloat(
            parseFloat(amount - obj.discount).toFixed(2)
          );
          if (chatRoom.user_id.toString() === user_id) {
            offerRequest.offer_by = "USER";
          }
          if (chatRoom.seller_id.toString() === user_id) {
            offerRequest.offer_by = "SELLER";
          }

          if (useWallet === "true") {
            offerRequest.walletUse = true;
            if (walletAmount > obj.total) {
              offerRequest.wallet_amount = obj.total;
            } else {
              offerRequest.wallet_amount = walletAmount;
            }

            /**
             * Update on wallet
             */

            await walletService.blockAmountRecord({
              user_id: user_id,
              post_id: post._id,
              amount: offerRequest.wallet_amount,
            });
          }

          offerRequest.item = obj;
          offerRequest.shipping = shipping;
          offerRequest.meetUp = meetUp;
          offerRequest.paymentId = paymentId;
          await Offer.updateOne({ _id: findOffer._id }, offerRequest);
          await Offer.updateOne({ _id: findOffer._id }, { expired: false });
          await ChatRoom.updateOne({ _id: chatRoom._id }, { expired: false });
          var offerSave = findOffer;
        } else {
          var offerRequest = new Offer();
          if (chatRoom) {
            offerRequest.user_id = chatRoom.user_id;
            offerRequest.seller_id = chatRoom.seller_id;
          } else {
            offerRequest.user_id = user_id;
            offerRequest.seller_id = post.user_id;
          }

          if (useWallet === "true") {
            offerRequest.walletUse = true;
            if (walletAmount > obj.total) {
              offerRequest.wallet_amount = obj.total;
            } else {
              offerRequest.wallet_amount = walletAmount;
            }

            /**
             * Update on wallet
             */

            await walletService.blockAmountRecord({
              user_id: user_id,
              post_id: post._id,
              amount: offerRequest.wallet_amount,
            });
          }

          offerRequest.post_id = post._id;
          offerRequest.room = room;
          offerRequest.price = parseFloat(
            parseFloat(amount - obj.discount).toFixed(2)
          );
          if (chatRoom.user_id.toString() === user_id) {
            offerRequest.offer_by = "USER";
          }
          if (chatRoom.seller_id.toString() === user_id) {
            offerRequest.offer_by = "SELLER";
          }

          offerRequest.item = obj;
          offerRequest.shipping = shipping;
          offerRequest.meetUp = meetUp;
          offerRequest.paymentId = paymentId;
          var offerSave = await offerRequest.save();
        }

        await Post.updateOne({ _id: post._id }, { offer: post.offer + 1 });

        await Offer.updateOne(
          { _id: offerSave._id },
          {
            paymentId: requestData.paymentId,
            paymentType: requestData.paymentType,
            status: "OFFER_SENT",
          }
        );

        /**
         * Submit offer history
         */
        var offerHistory = new OfferHistory();

        offerHistory.user_id = user_id;
        offerHistory.offer_id = offerSave._id;
        offerHistory.price = parseFloat(parseFloat(amount).toFixed(2));
        offerHistory.item = obj;
        if (chatRoom.user_id.toString() === user_id) {
          offerRequest.offer_by = "BUYER";
        }
        if (chatRoom.seller_id.toString() === user_id) {
          offerRequest.offer_by = "SELLER";
        }
        offerHistory.save();

        /**
         * Create chat history
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        chatMessageRequest.is_offer = true;
        if (chatRoom.user_id.toString() === user_id) {
          chatMessageRequest.sender = chatRoom.user_id;
          chatMessageRequest.receiver = chatRoom.seller_id;
        }
        if (chatRoom.seller_id.toString() === user_id) {
          chatMessageRequest.sender = chatRoom.seller_id;
          chatMessageRequest.receiver = chatRoom.user_id;
        }

        chatMessageRequest.room = room;
        chatMessageRequest.item = obj;
        chatMessageRequest.itemData = true;
        chatMessageRequest.status = false;
        if (chatRoom.user_id.toString() === user_id) {
          chatMessageRequest.seller_status = "RECEIVED_OFFER";
          chatMessageRequest.buyer_status = "SEND_OFFER";
        }
        if (chatRoom.seller_id.toString() === user_id) {
          chatMessageRequest.seller_status = "SEND_OFFER";
          chatMessageRequest.buyer_status = "RECEIVED_OFFER";
        }
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        /**
         * send messageDetails
         */
        const roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemObjectArray = [];
        var itemObject = {};
        itemObject.message = setMessage(roomDataList.message, "en");
        itemObject.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        itemObject.message_arabic = setMessage(roomDataList.message, "ar");
        itemObject.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        itemObject._id = roomDataList._id;
        itemObject.seller_status = roomDataList.seller_status;
        itemObject.buyer_status = roomDataList.buyer_status;
        itemObject.item = roomDataList.item;
        itemObject.type = roomDataList.type;
        itemObject.isCard = roomDataList.isCard;
        itemObject.offerCancel = roomDataList.offerCancel;
        itemObject.sender = roomDataList.sender;
        itemObject.receiver = roomDataList.receiver;
        itemObject.offerCancel = roomDataList.offerCancel;
        itemObject.date = date(roomDataList.created_at);
        itemObject.time = time(roomDataList.created_at);
        itemObjectArray.push(itemObject);

        io.sockets.in(roomSocketId).emit("messageDetails", itemObjectArray);

        /**
         * Send room Details
         */
        if (roomSocketId) {
          const roomData = await ChatRoom.findOne({ _id: roomSocketId });
          if (roomData) {
            var offerCount = await Offer.countDocuments({
              room: roomSocketId,
              expired: false,
            });
            const seller = await User.findOne(
              { _id: roomData.seller_id },
              {
                first_name: 1,
                last_name: 1,
                image: 1,
                rating: 1,
                totalRating: 1,
              }
            );
            const buyer = await User.findOne(
              { _id: roomData.user_id },
              {
                first_name: 1,
                last_name: 1,
                image: 1,
                rating: 1,
                totalRating: 1,
              }
            );
            roomData.item.meetUp = roomData.item.meetUp ? true : false;
            roomData.item.shipping = roomData.shipping;
            var data = {
              room: room,
              orderCancelButton: roomData.orderCancelButton,
              order_id: roomData.order_id,
              seller: seller,
              buyer: buyer,
              item: roomData.item,
              buyNow: post.buyNow,
              offerCount: roomData.buyNow ? 1 : offerCount,
            };
            io.sockets.in(roomSocketId).emit("room-details", data);
          }
        }
        io.sockets.in(user_id).emit("error", {
          message: setMessage("OFFER_SAVE", language),
        });
      } catch (err) {
        io.sockets.in(user_id).emit("error", {
          message: setMessage(err.message, language),
        });
      }
    } catch (err) {
      console.log("err ==>", err);
      var obj = { api: "send-offer", error: err };
      logger.socketError(JSON.stringify(obj));
      io.sockets.in(user_id).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('offer-accept',"61c2cf2033e0333dc0cd60bc",{"user_id":"61c1ae2f57ae2226b42892b9","language":"en"});
   *
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  offerAccept: async (room, io, data, socket) => {
    var roomSocketId = room;
    var language = data.language;
    var requestData = data;
    socket.join(requestData.user_id);

    try {
      var roomData = await ChatRoom.findOne({ _id: room });
      if (requestData.cardId) {
        await ChatRoom.updateOne({ _id: room }, { cardId: requestData.cardId });
      }
      if (requestData.paymentType) {
        var roomItem = roomData.item;
        roomItem.payment_type = requestData.paymentType;
        roomItem.paymentMethod = requestData.paymentType;

        await ChatRoom.updateOne(
          { _id: room },
          { paymentType: requestData.paymentType, item: roomItem }
        );
      }
      if (!roomData.item.shipping && requestData.paymentType === "ONLINE") {
        var roomItem = roomData.item;
        roomItem.processing_fee = await getProcessingFee(roomItem.price);
        var setting = await Setting.findOne();
        roomItem.serviceFees = parseFloat(
          ((setting.admin_commission / 100) * roomItem.price).toFixed(2)
        );
        roomItem.total = roomItem.price;
        await ChatRoom.updateOne({ _id: room }, { item: roomItem });
      }
      var roomData = await ChatRoom.findOne({ _id: room });
      var whereHouse = await WhereHouse.findOne();
      if (roomData) {
        var offer = await Offer.findOne({ room: room });
        var walletAmount = await walletService.getAmount({
          user_id: offer.user_id,
        });

        if (requestData.useWallet) {
          var offerUpdateRequest = {};
          offerUpdateRequest.walletUse = true;
          if (walletAmount > offer.price) {
            offerUpdateRequest.wallet_amount = offer.price;
          } else {
            offerUpdateRequest.wallet_amount = walletAmount;
          }
          await Offer.updateOne({ _id: offer._id }, offerUpdateRequest);
        }

        var findAccepted = await Offer.findOne({
          _id: offer._id,
          status: "ACCEPTED",
        });

        if (findAccepted) {
          io.sockets.in(requestData.user_id).emit("error", {
            message: setMessage("OFFER_ACCEPT_OTHER", language),
          });
          return false;
        }

        await Offer.updateOne({ _id: offer._id }, { status: "ACCEPTED" });
        var paymentData = {};
        offer = await Offer.findOne({ room: room });

        if (offer.item.shipping && roomData.paymentType === "ONLINE") {
          await Offer.updateOne({ _id: offer._id }, { status: "ACCEPTED" });
          const post = await Post.findOne({ _id: offer.post_id });
          var shippingFrom = await Address.findOne({ _id: post.shipping_id });

          if (offer.walletUse) {
            if (walletAmount < offer.wallet_amount) {
              var lastMessage = "WALLET_AMOUNT";
              var lastMessageSeller = "WALLET_AMOUNT";
              await updateOfferListing(socket, io, roomData.user_id);

              await Offer.updateOne(
                { room: roomData._id },
                { expired: true, status: "CANCELED" }
              );
              await ChatRoom.updateOne(
                { _id: roomData._id },
                { expired: true, orderCancelButton: false }
              );
              await walletService.unBlockAmountRecord({
                user_id: roomData.user_id,
                post_id: post._id,
              });
              io.sockets.in(roomSocketId).emit("successfully", {
                message: setMessage("OFFER_CANCEL", language),
              });

              /**
               * Create expired card
               */

              var lastMessageSeller = "Offer Canceled";
              var lastMessage = "Offer Canceled";
              await updateMessageCard(
                socket,
                io,
                roomData,
                data,
                lastMessageSeller,
                lastMessage
              );

              /**
               * Update offer
               */
              await ChatMessage.updateMany(
                { room: roomData._id, itemData: true },
                { seller_status: "CANCELED", buyer_status: "CANCELED" }
              );

              /**
               * Create chat history Expired
               */
              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = requestData.seller_id;
              chatMessageRequest.receiver = roomData.user_id;
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.item = roomData.item;
              chatMessageRequest.itemData = false;
              chatMessageRequest.status = false;
              chatMessageRequest.expired = true;
              chatMessageRequest.type = "BUYER";
              chatMessageRequest.message = "LOW_AMOUNT_BUYER";
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = requestData.user_id;
              chatMessageRequest.receiver = roomData.seller_id;
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.item = roomData.item;
              chatMessageRequest.itemData = false;
              chatMessageRequest.status = false;
              chatMessageRequest.expired = true;
              chatMessageRequest.type = "SELLER";
              chatMessageRequest.message = "LOW_AMOUNT_SELLER";
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              const roomDataArray = await ChatMessage.find({
                room: roomData._id,
                seller_status: { $ne: "CANCELED" },
              });

              var meetUpPop = false;

              var data = [];
              roomDataArray.forEach((item) => {
                var obj = {};
                obj._id = item._id;
                obj.message = setMessage(item.message, "en");
                obj.systemMessage = setSystemMessage(item.systemMessage, "en");
                obj.message_arabic = setMessage(item.message, "ar");
                obj.systemMessage_arabic = setSystemMessage(
                  item.systemMessage,
                  "ar"
                );
                obj.seller_status = item.seller_status;
                obj.buyer_status = item.buyer_status;
                obj.item = item.item;
                obj.type = item.type;
                obj.meetUpPop = meetUpPop;
                obj.isCard = item.isCard;
                obj.offerCancel = item.offerCancel;
                obj.item.paymentType = roomData.paymentType;
                obj.sender = item.sender;
                obj.receiver = item.receiver;
                obj.date = date(item.created_at);
                obj.time = time(item.created_at);
                data.push(obj);
              });
              io.sockets.in(roomSocketId).emit("chat-details", data);
              return false;
            } else {
              if (offer.wallet_amount != 0) {
                var createPattern = {
                  user_id: roomData.user_id,
                  amount: offer.wallet_amount,
                  type: "DEBIT",
                  remark: `Buy for product`,
                };
                await walletService.saveRecord(createPattern);
              }

              if (post) {
                if (post.sold) {
                  io.sockets.in(requestData.user_id).emit("error", {
                    message: setMessage("POST_SOLD", language),
                  });
                  return false;
                }
                await Post.updateOne(
                  { _id: post._id },
                  { lastDate: moment().toISOString() }
                );

                /**
                 * for buyer
                 */
                var orderNumber = await Order.countDocuments();
                var message = `Order was placed successfully, Order ID: 00000${
                  orderNumber === 0 ? 1 : orderNumber + 1
                }, You will be updated shortly`;

                var systemMessage = [
                  { message: "ORDER_PLACED" },
                  {
                    message: `Order ID: 00000${
                      orderNumber === 0 ? 1 : orderNumber + 1
                    }`,
                  },
                  { message: "ORDER_PLACED_UPDATE" },
                ];

                /**
                 * Update offer
                 */
                await ChatMessage.updateMany(
                  {
                    room: new mongoose.Types.ObjectId(roomData._id),
                    expired: false,
                    seller_status: {
                      $nin: [
                        "CANCELED",
                        "SYSTEM_CARD",
                        "EXPIRED",
                        "SYSTEM_EXPIRED",
                      ],
                    },
                  },
                  { seller_status: "ACCEPTED", buyer_status: "ACCEPTED" }
                );

                /**
                 * Get Accepted message list
                 */
                var acceptedData = await ChatMessage.findOne(
                  { room: roomData._id },
                  { _id: 1 }
                ).sort({ _id: -1 });

                io.sockets.in(roomSocketId).emit("acceptedOffer", acceptedData);

                var chatMessageRequest = new ChatMessage();
                chatMessageRequest.isCard = true;
                chatMessageRequest.sender = roomData.seller_id;
                chatMessageRequest.receiver = roomData.user_id;

                /**
                 * Buyer order message
                 */
                chatMessageRequest.room = roomData._id;
                chatMessageRequest.isCard = true;
                chatMessageRequest.status = false;
                chatMessageRequest.seller_status = "SYSTEM_CARD";
                chatMessageRequest.buyer_status = "SYSTEM_CARD";
                chatMessageRequest.type = "BUYER";
                chatMessageRequest.item = roomData.item;
                chatMessageRequest.message = message;
                chatMessageRequest.systemMessage = systemMessage;
                chatMessageRequest.lastDate = moment().toISOString();
                var lastMessage = await chatMessageRequest.save();

                var roomDataList = await ChatMessage.findOne({
                  _id: lastMessage._id,
                });
                var itemData = [];
                var messageData = {};

                messageData.message = setMessage(roomDataList.message, "en");
                messageData.systemMessage = setSystemMessage(
                  systemMessage,
                  "en"
                );
                messageData.message_arabic = setMessage(
                  roomDataList.message,
                  "ar"
                );
                messageData.systemMessage_arabic = setSystemMessage(
                  systemMessage,
                  "ar"
                );

                messageData._id = roomDataList._id;
                messageData.seller_status = roomDataList.seller_status;
                messageData.buyer_status = roomDataList.buyer_status;
                messageData.item = roomDataList.item;
                messageData.sender = roomDataList.sender;
                messageData.receiver = roomDataList.receiver;
                messageData.type = roomDataList.type;
                messageData.isCard = roomDataList.isCard;
                messageData.offerCancel = roomDataList.offerCancel;
                messageData.date = date(roomDataList.created_at);
                messageData.time = time(roomDataList.created_at);
                itemData.push(messageData);
                io.sockets.in(room).emit("messageDetails", itemData);

                /**
                 * Seller message
                 */
                var chatMessageRequest = new ChatMessage();
                chatMessageRequest.isCard = true;
                chatMessageRequest.sender = roomData.user_id;
                chatMessageRequest.receiver = roomData.seller_id;
                chatMessageRequest.room = roomData._id;
                chatMessageRequest.isCard = true;
                chatMessageRequest.status = false;
                chatMessageRequest.seller_status = "SYSTEM_CARD";
                chatMessageRequest.buyer_status = "SYSTEM_CARD";
                chatMessageRequest.type = "SELLER";
                chatMessageRequest.item = {};
                chatMessageRequest.message = message;
                chatMessageRequest.systemMessage = systemMessage;
                chatMessageRequest.lastDate = moment().toISOString();
                var lastMessage = await chatMessageRequest.save();

                var roomDataList = await ChatMessage.findOne({
                  _id: lastMessage._id,
                });
                var itemData = [];
                var messageData = {};

                messageData.message = setMessage(roomDataList.message, "en");
                messageData.systemMessage = setSystemMessage(
                  roomDataList.systemMessage,
                  "en"
                );
                messageData.message_arabic = setMessage(
                  roomDataList.message,
                  "ar"
                );
                messageData.systemMessage_arabic = setSystemMessage(
                  roomDataList.systemMessage,
                  "ar"
                );
                messageData._id = roomDataList._id;
                messageData.seller_status = roomDataList.seller_status;
                messageData.buyer_status = roomDataList.buyer_status;
                messageData.item = roomDataList.item;
                messageData.sender = roomDataList.sender;
                messageData.receiver = roomDataList.receiver;
                messageData.type = roomDataList.type;
                messageData.isCard = roomDataList.isCard;
                messageData.offerCancel = roomDataList.offerCancel;
                messageData.date = date(roomDataList.created_at);
                messageData.time = time(roomDataList.created_at);
                itemData.push(messageData);
                io.sockets.in(room).emit("messageDetails", itemData);

                if (roomData.user_id.toString() === data.user_id) {
                  var lastMessageSeller = "OFFER_ACCEPTED";
                  var lastMessage = "OFFER_ACCEPTED";
                  await updateOfferListing(socket, io, roomData.seller_id);
                }
                if (roomData.seller_id.toString() === data.user_id) {
                  var lastMessageSeller = "OFFER_ACCEPTED";
                  var lastMessage = "OFFER_ACCEPTED";
                  await updateOfferListing(socket, io, roomData.user_id);
                }
                await updateMessageCard(
                  socket,
                  io,
                  roomData,
                  data,
                  lastMessageSeller,
                  lastMessage
                );

                var findPattern = {
                  post_id: roomData.post_id,
                  user_id: { $ne: roomData.user_id },
                };
                await offerService.soldMessage(findPattern);

                /**
                 * Payment Capture
                 */
                var paymentId = "";
                if (requestData.acceptBy === "BUYER") {
                  paymentId = requestData.paymentId;
                } else {
                  paymentId = offer.paymentId;
                }
                if (offer.paymentType === "ONLINE") {
                  paymentData = await paymentService.capture({
                    paymentId: paymentId,
                    userId: requestData.user_id,
                    amount: offer.item.total,
                    trackID: offer._id,
                  });
                }

                await ChatMessage.updateMany(
                  {
                    room: new mongoose.Types.ObjectId(roomData._id),
                    expired: false,
                    seller_status: {
                      $in: ["SEND_OFFER", "RECEIVED_OFFER"],
                    },
                  },
                  { item: roomData.item }
                );

                /**
                 * Send notification to seller
                 */
                var sellerNotification = await User.findOne({
                  _id: roomData.user_id,
                });
                var title = setMessage(
                  "NEW_ORDER",
                  sellerNotification.language
                );
                var request = {};
                request.user = sellerNotification;
                request.message = "";
                request.title = title;
                request.type = "CHAT";
                request.roomId = roomData._id;
                request.isMail = true;
                request.orderId = "";

                var t = i18next.t;
                i18next.changeLanguage(sellerNotification.language);
                var OrderNumber = orderNumber === 0 ? 1 : orderNumber + 1;
                request.message = t("ORDER_CREATE", { OrderNumber });
                sendNotification(request);

                /**
                 * Check Order Ranking
                 */
                var orderRanking = await OrderRanking.findOne(
                  {
                    "category._id": post.category,
                    "brand._id": post.brand,
                  },
                  { count: 1 }
                );
                if (orderRanking) {
                  var orderRankingRequest = {};
                  orderRankingRequest.count = orderRanking.count + 1;
                  OrderRanking.updateOne(
                    { _id: orderRanking._id },
                    orderRankingRequest
                  );
                } else {
                  var orderRankingRequest = new OrderRanking();
                  orderRankingRequest.category = await Category.findOne(
                    {
                      _id: post.category,
                    },
                    { title: 1, translate: 1 }
                  );
                  orderRankingRequest.brand = await Brand.findOne(
                    {
                      _id: post.brand,
                    },
                    { title: 1, translate: 1 }
                  );
                  orderRankingRequest.count = 1;
                  orderRankingRequest.save();
                }

                var createObj = new Order();
                if (roomData.cardId) {
                  const cardItem = await Card.findOne(
                    { _id: roomData.cardId },
                    { cardBrand: 1, maskedCardNo: 1 }
                  );
                  createObj.card = cardItem;
                }

                var image = "";
                createObj.user_id = roomData.user_id;
                createObj.paymentId = "";
                createObj.tranId = "";
                createObj.seller_id = post.user_id;
                createObj.post_id = post.id;
                createObj.order_number =
                  orderNumber === 0 ? 1 : orderNumber + 1;
                createObj.order_number_show = `#00000${createObj.order_number}`;
                createObj.price = roomData.item.price;
                createObj.admin_commission = offer.item.serviceFees;
                createObj.seller_amount = offer.item.sellerPayout;
                createObj.paymentData = paymentData;
                createObj.discount_price = roomData.item.discount;
                createObj.shipping_fee = roomData.item.shipping_fee;
                createObj.processing_fee = roomData.item.processing_fee;
                createObj.payment_type = roomData.paymentType;
                createObj.payment_status = true;
                createObj.shipping_to = roomData.address;
                createObj.shipping_from = roomData.item.addresses;
                createObj.shipping = true;
                createObj.coupon_code = roomData.coupon;

                var match = { _id: new mongoose.Types.ObjectId(offer.post_id) };
                const postItem = await Post.aggregate([
                  {
                    $lookup: {
                      from: "postimages",
                      localField: "_id",
                      foreignField: "post_id",
                      as: "postimages",
                    },
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "user_id",
                      foreignField: "_id",
                      as: "users",
                    },
                  },
                  { $unwind: "$users" },
                  {
                    $lookup: {
                      from: "categories",
                      localField: "category",
                      foreignField: "_id",
                      as: "categories",
                    },
                  },
                  {
                    $unwind: {
                      path: "$categories",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: "brands",
                      localField: "brand",
                      foreignField: "_id",
                      as: "brands",
                    },
                  },
                  {
                    $unwind: {
                      path: "$brands",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: "conditions",
                      localField: "condition",
                      foreignField: "_id",
                      as: "conditions",
                    },
                  },
                  { $unwind: "$conditions" },
                  {
                    $lookup: {
                      from: "models",
                      localField: "brandModel",
                      foreignField: "_id",
                      as: "models",
                    },
                  },
                  {
                    $unwind: {
                      path: "$models",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $match: match,
                  },
                  {
                    $project: {
                      _id: 1,
                      created_at: 1,
                      title: 1,
                      description: 1,
                      price: 1,
                      shipping_fee: 1,
                      processing_fee: 1,
                      payment_type: 1,
                      shipping: 1,
                      who_pay: 1,
                      view: 1,
                      boot: 1,
                      item_information: 1,
                      "users.first_name": 1,
                      "users.last_name": 1,
                      "users.image": 1,
                      "categories.translate": 1,
                      "brands.translate": 1,
                      "conditions.translate": 1,
                      "models.translate": 1,
                      postimages: 1,
                      location: 1,
                      discountPrice: 1,
                    },
                  },
                ]);
                if (postItem.length > 0) {
                  createObj.item = postItem[0];
                }
                await Promise.map(postItem, async (item) => {
                  await Promise.map(item.postimages, async (postImage) => {
                    image = await getPostImageUrl(postImage.title);
                  });
                });
                createObj.item.price = roomData.item.price;
                createObj.item.discount_price = roomData.item.discount;
                createObj.item.shipping_fee = roomData.item.shipping_fee;
                createObj.item.processing_fee = roomData.item.processing_fee;
                createObj.item.payment = roomData.item.paymentMethod;
                const lastSavePost = await createObj.save();

                /**
                 * Update order it
                 */
                await ChatRoom.updateOne(
                  { _id: room },
                  { order_id: lastSavePost._id, orderCancelButton: true }
                );

                var findPattern = {
                  orderId: lastSavePost._id,
                };
                var orderId = lastSavePost._id;
                var orderData = await Order.findOne({ _id: lastSavePost._id });

                /**
                 * Create Shipment
                 */
                var sellerData = await User.findOne({
                  _id: lastSavePost.seller_id,
                });
                var labelCreateRequest = {
                  FromAddress: {
                    Line1: `${shippingFrom.apartment_name} ${shippingFrom.street_name}`,
                    Line2: `${shippingFrom.district}`,
                    Line3: "",
                    City: shippingFrom.city,
                    PostCode: shippingFrom.postal_code,
                  },
                  FromContact: {
                    PersonName: `${sellerData.first_name} ${sellerData.last_name}`,
                    CompanyName: `${sellerData.first_name} ${sellerData.last_name}`,
                    PhoneNumber: sellerData.mobile_number,
                  },
                  ToAddress: {
                    Line1: whereHouse.line1,
                    Line2: whereHouse.line2,
                    Line3: whereHouse.line3,
                    City: whereHouse.city,
                    PostCode: whereHouse.postCode,
                  },
                  ToContact: {
                    PersonName: process.env.PERSON_NAME,
                    CompanyName: process.env.COMPANY_NAME,
                    PhoneNumber: process.env.COMPANY_NUMBER,
                  },
                  PickupLocation: whereHouse.line1,
                  pickUpTime: moment().add(3, "days").toISOString(),
                  FromDateTime: moment().add(3, "days").valueOf(),
                  OperatingInstruction: "OperatingInstruction...",
                  Remarks: "SELLER-DOFFO",
                  ShipmentRef: `${orderData.order_number_show}`,
                  ShipperRef: `SELLER-DOFFO`,
                  ConsigneeRef1: `#${await padLeadingZeros(
                    post.postNumber,
                    10
                  )}`,
                  ConsigneeRef2: `-`,
                  DescriptionOfGoods: `${post.title}`,
                  OrderId: `${orderData.order_number}`,
                  Dimensions: {
                    Length: post.item_information.length,
                    Width: post.item_information.width,
                    Height: post.item_information.height,
                  },
                  ActualWeight: post.item_information.weight,
                };

                offerService.createShippingLabelAramex(
                  "LABEL_1",
                  lastSavePost,
                  "SELLER-DOFFO",
                  labelCreateRequest
                );

                const roomDetails = await ChatRoom.findOne({
                  _id: roomData._id,
                });

                /**
                 * for seller
                 */
                var orderNumber = await Order.countDocuments();

                if (!roomDetails.trackingNumber1) {
                  /**
                   * Create card for buyer
                   */

                  var chatMessageRequest = new ChatMessage();
                  chatMessageRequest.isCard = true;
                  chatMessageRequest.sender = roomDetails.seller_id;
                  chatMessageRequest.receiver = roomDetails.user_id;
                  var itemRequest = roomDetails.item;
                  itemRequest.order_step = "SELLER-DOFFO";
                  itemRequest.orderId = orderId;

                  var results = await Order.findOne({ _id: orderId });

                  chatMessageRequest.room = roomDetails._id;
                  chatMessageRequest.status = false;
                  chatMessageRequest.itemData = true;
                  chatMessageRequest.type = "BUYER";
                  chatMessageRequest.seller_status = "TRACK_ORDER";
                  chatMessageRequest.buyer_status = "TRACK_ORDER";
                  chatMessageRequest.item = itemRequest;
                  chatMessageRequest.message = "";
                  chatMessageRequest.lastDate = moment().toISOString();
                  var lastMessage = await chatMessageRequest.save();

                  var roomDataList = await ChatMessage.findOne({
                    _id: lastMessage._id,
                  });
                  var itemData = [];
                  var messageData = {};

                  messageData.message = setMessage(roomDataList.message, "en");
                  messageData.systemMessage = setSystemMessage(
                    roomDataList.systemMessage,
                    "en"
                  );
                  messageData.message_arabic = setMessage(
                    roomDataList.message,
                    "ar"
                  );
                  messageData.systemMessage_arabic = setSystemMessage(
                    roomDataList.systemMessage,
                    "ar"
                  );
                  messageData._id = roomDataList._id;
                  messageData.seller_status = roomDataList.seller_status;
                  messageData.buyer_status = roomDataList.buyer_status;
                  messageData.item = roomDataList.item;
                  messageData.sender = roomDataList.sender;
                  messageData.receiver = roomDataList.receiver;
                  messageData.type = roomDataList.type;
                  messageData.isCard = roomDataList.isCard;
                  messageData.offerCancel = roomDataList.offerCancel;
                  messageData.date = date(roomDataList.created_at);
                  messageData.time = time(roomDataList.created_at);
                  itemData.push(messageData);
                  io.sockets.in(room).emit("messageDetails", itemData);

                  /**
                   * Create card for seller
                   */
                  var chatMessageRequest = new ChatMessage();
                  chatMessageRequest.isCard = true;
                  chatMessageRequest.sender = roomDetails.user_id;
                  chatMessageRequest.receiver = roomDetails.seller_id;
                  chatMessageRequest.room = roomDetails._id;
                  chatMessageRequest.status = false;
                  chatMessageRequest.type = "SELLER";
                  chatMessageRequest.seller_status = "PICK_UP";
                  chatMessageRequest.buyer_status = "PICK_UP";
                  chatMessageRequest.item = itemRequest;
                  chatMessageRequest.message = "";
                  chatMessageRequest.lastDate = moment().toISOString();
                  var lastMessage = await chatMessageRequest.save();

                  var roomDataList = await ChatMessage.findOne({
                    _id: lastMessage._id,
                  });
                  var itemData = [];
                  var messageData = {};

                  messageData.message = setMessage(roomDataList.message, "en");
                  messageData.systemMessage = setSystemMessage(
                    roomDataList.systemMessage,
                    "en"
                  );
                  messageData.message_arabic = setMessage(
                    roomDataList.message,
                    "ar"
                  );
                  messageData.systemMessage_arabic = setSystemMessage(
                    roomDataList.systemMessage,
                    "ar"
                  );
                  messageData._id = roomDataList._id;
                  messageData.seller_status = roomDataList.seller_status;
                  messageData.buyer_status = roomDataList.buyer_status;
                  messageData.item = roomDataList.item;
                  messageData.sender = roomDataList.sender;
                  messageData.receiver = roomDataList.receiver;
                  messageData.type = roomDataList.type;
                  messageData.isCard = roomDataList.isCard;
                  messageData.offerCancel = roomDataList.offerCancel;
                  messageData.date = date(roomDataList.created_at);
                  messageData.time = time(roomDataList.created_at);
                  itemData.push(messageData);
                  io.sockets.in(room).emit("messageDetails", itemData);

                  /**
                   * Update trackingNumber on room
                   */
                  await ChatRoom.updateOne(
                    { _id: roomDetails._id },
                    {
                      trackingNumber1: results.trackingNumber1,
                      item: itemRequest,
                    }
                  );
                }

                /**
                 * Send email to admin
                 */
                const adminUserData = await User.findOne(
                  { role_id: 1 },
                  { first_name: 1, last_name: 1, email: 1, language: 1 }
                );
                const UserData = await User.findOne(
                  { _id: lastSavePost.user_id },
                  { first_name: 1, last_name: 1, email: 1, language: 1 }
                );
                const SellerData = await User.findOne(
                  { _id: lastSavePost.seller_id },
                  {
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    language: 1,
                    device_token: 1,
                  }
                );

                var options = await email_service.getEmailTemplateBySlug(
                  "admin-purchases-item",
                  adminUserData.language
                );
                options.description = _.replace(
                  options.description,
                  "[NAME]",
                  `${adminUserData.first_name} ${adminUserData.last_name}`
                );
                options.description = _.replace(
                  options.description,
                  "[USER_NAME]",
                  `${UserData.first_name} ${UserData.last_name}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM_NAME]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[ORDER_NUMBER]",
                  `${orderNumber}`
                );
                options.description = _.replace(
                  options.description,
                  "[IMAGE]",
                  `${image}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[PRICE]",
                  `${createObj.price}`
                );
                options.description = _.replace(
                  options.description,
                  "[DISCOUNT]",
                  `${createObj.discount_price}`
                );
                options.description = _.replace(
                  options.description,
                  "[SHIPPING_FEE]",
                  `${createObj.shipping_fee}`
                );
                options.description = _.replace(
                  options.description,
                  "[PROCESSING_FEE]",
                  `${createObj.processing_fee}`
                );
                options.description = _.replace(
                  options.description,
                  "[FINAL_PRICE]",
                  `${(
                    createObj.price +
                    createObj.shipping_fee -
                    createObj.discount_price
                  ).toFixed(2)}`
                );
                options.toEmail = adminUserData.email;
                sendMail(options);

                /**
                 * Send notification to seller
                 */
                var t = i18next.t;
                i18next.changeLanguage("en");

                var postNumber = await padLeadingZeros(post.postNumber, 10);
                var userName = `${UserData.first_name} ${UserData.last_name}`;
                var message = t("ITEM_ORDER", { postNumber, userName });

                var notification = {};
                notification.user = SellerData;
                notification.message = message;
                notification.title = t("ITEM_SOLD_NOTIFICATION");
                notification.link = `${process.env.BASE_URL}notification`;
                notification.isMail = true;
                sendNotification(notification);

                /**
                 * Send to seller
                 */
                var options = await email_service.getEmailTemplateBySlug(
                  "admin-purchases-item",
                  SellerData.language
                );
                options.description = _.replace(
                  options.description,
                  "[NAME]",
                  `${SellerData.first_name} ${SellerData.last_name}`
                );
                options.description = _.replace(
                  options.description,
                  "[USER_NAME]",
                  `${UserData.first_name} ${UserData.last_name}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM_NAME]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[ORDER_NUMBER]",
                  `${orderNumber}`
                );
                options.description = _.replace(
                  options.description,
                  "[IMAGE]",
                  `${image}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[PRICE]",
                  `${createObj.price}`
                );
                options.description = _.replace(
                  options.description,
                  "[DISCOUNT]",
                  `${createObj.discount_price}`
                );
                options.description = _.replace(
                  options.description,
                  "[SHIPPING_FEE]",
                  `${createObj.shipping_fee}`
                );
                options.description = _.replace(
                  options.description,
                  "[PROCESSING_FEE]",
                  `${createObj.processing_fee}`
                );
                options.description = _.replace(
                  options.description,
                  "[FINAL_PRICE]",
                  `${(
                    createObj.price +
                    createObj.shipping_fee +
                    createObj.processing_fee -
                    createObj.discount_price
                  ).toFixed(2)}`
                );
                options.toEmail = SellerData.email;
                sendMail(options);

                /**
                 * Create invoice
                 */
                var invoiceURl = `${
                  process.env.INVOICE_URL + lastSavePost._id
                }&language=${UserData.language}`;
                var wkhtmltopdf = require("wkhtmltopdf");
                var fs = require("fs");
                await wkhtmltopdf(invoiceURl, { pageSize: "letter" }).pipe(
                  await fs.createWriteStream(
                    "public/invoices/" + lastSavePost._id + ".pdf"
                  )
                );

                /**
                 * Send mail to customer
                 */
                var options = await email_service.getEmailTemplateBySlug(
                  "item-purchasing",
                  UserData.language
                );
                options.description = _.replace(
                  options.description,
                  "[NAME]",
                  `${UserData.first_name} ${UserData.last_name}`
                );
                options.description = _.replace(
                  options.description,
                  "[ITEM_NAME]",
                  `${post.title}`
                );
                options.description = _.replace(
                  options.description,
                  "[ORDER_NUMBER]",
                  `${orderNumber}`
                );
                options.toEmail = UserData.email;
                options.attachments = [
                  {
                    filename: lastSavePost._id + ".pdf",
                    path: "public/invoices/" + lastSavePost._id + ".pdf",
                  },
                ];
                sendMailAttachments(options);
                await Post.updateOne(
                  { _id: post._id },
                  {
                    sold: true,
                    //boost: false,
                    soldDate: moment().toISOString(),
                    removeBuying: true,
                  }
                );

                if (post.boostRequest) {
                  if (
                    post.boostRequest.boot &&
                    post.boostRequest.boot.slug === "27-days-plan"
                  ) {
                    // await Post.updateOne(
                    //   { _id: post._id },
                    //   {
                    //     sold: true,
                    //     boost: false,
                    //     boostRequest: {},
                    //     soldDate: moment().toISOString(),
                    //   }
                    // );
                    // await PurchaseBoot.updateOne(
                    //   { _id: post.boostRequest._id },
                    //   { status: false }
                    // );
                  }
                }

                await Recommend.deleteMany({ post_id: post._id });
                await Favorite.deleteMany({ post_id: post._id });
              } else {
                io.sockets.in(requestData.user_id).emit("error", {
                  message: setMessage("POST_SOLD", language),
                });
                return false;
              }
            }
          } else {
            if (post) {
              if (post.sold) {
                // io.sockets.in(requestData.user_id).emit("error", {
                //   message: setMessage("POST_SOLD", language),
                // });
                // return false;
              }

              await Post.updateOne(
                { _id: post._id },
                { lastDate: moment().toISOString() }
              );

              /**
               * for buyer
               */
              var orderNumber = await Order.countDocuments();
              var message = `Order was placed successfully, Order ID: 00000${
                orderNumber === 0 ? 1 : orderNumber + 1
              }, You will be updated shortly`;

              var systemMessage = [
                { message: "ORDER_PLACED" },
                {
                  message: `Order ID: 00000${
                    orderNumber === 0 ? 1 : orderNumber + 1
                  }`,
                },
                { message: "ORDER_PLACED_UPDATE" },
              ];

              await ChatMessage.updateMany(
                {
                  room: new mongoose.Types.ObjectId(roomData._id),
                  expired: false,
                  seller_status: {
                    $in: ["SEND_OFFER", "RECEIVED_OFFER"],
                  },
                },
                { item: roomData.item }
              );

              /**
               * Update offer
               */
              await ChatMessage.updateMany(
                {
                  room: new mongoose.Types.ObjectId(roomData._id),
                  expired: false,
                  seller_status: {
                    $nin: [
                      "CANCELED",
                      "SYSTEM_CARD",
                      "EXPIRED",
                      "SYSTEM_EXPIRED",
                    ],
                  },
                },
                { seller_status: "ACCEPTED", buyer_status: "ACCEPTED" }
              );

              /**
               * Get Accepted message list
               */
              var acceptedData = await ChatMessage.findOne(
                { room: roomData._id },
                { _id: 1 }
              ).sort({ _id: -1 });

              io.sockets.in(roomSocketId).emit("acceptedOffer", acceptedData);

              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomData.seller_id;
              chatMessageRequest.receiver = roomData.user_id;

              /**
               * Buyer order message
               */
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.isCard = true;
              chatMessageRequest.status = false;
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.type = "BUYER";
              chatMessageRequest.item = roomData.item;
              chatMessageRequest.message = message;
              chatMessageRequest.systemMessage = systemMessage;
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(systemMessage, "en");
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                systemMessage,
                "ar"
              );

              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Seller message
               */
              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomData.user_id;
              chatMessageRequest.receiver = roomData.seller_id;
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.isCard = true;
              chatMessageRequest.status = false;
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.type = "SELLER";
              chatMessageRequest.item = {};
              chatMessageRequest.message = message;
              chatMessageRequest.systemMessage = systemMessage;
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Payment Capture
               */
              var paymentId = "";
              if (requestData.acceptBy === "BUYER") {
                paymentId = requestData.paymentId;
              } else {
                paymentId = offer.paymentId;
              }
              if (offer.paymentType === "ONLINE") {
                paymentData = await paymentService.capture({
                  paymentId: paymentId,
                  userId: requestData.user_id,
                  amount: offer.item.total,
                  trackID: offer._id,
                });
              }

              if (roomData.user_id.toString() === data.user_id) {
                var lastMessageSeller = "OFFER_ACCEPTED";
                var lastMessage = "OFFER_ACCEPTED";
                await updateOfferListing(socket, io, roomData.seller_id);
              }
              if (roomData.seller_id.toString() === data.user_id) {
                var lastMessageSeller = "OFFER_ACCEPTED";
                var lastMessage = "OFFER_ACCEPTED";
                await updateOfferListing(socket, io, roomData.user_id);
              }
              await updateMessageCard(
                socket,
                io,
                roomData,
                data,
                lastMessageSeller,
                lastMessage
              );

              var findPattern = {
                post_id: roomData.post_id,

                user_id: { $ne: roomData.user_id },
              };
              await offerService.soldMessage(findPattern);

              /**
               * Check Order Ranking
               */
              var orderRanking = await OrderRanking.findOne(
                {
                  "category._id": post.category,
                  "brand._id": post.brand,
                },
                { count: 1 }
              );
              if (orderRanking) {
                var orderRankingRequest = {};
                orderRankingRequest.count = orderRanking.count + 1;
                OrderRanking.updateOne(
                  { _id: orderRanking._id },
                  orderRankingRequest
                );
              } else {
                var orderRankingRequest = new OrderRanking();
                orderRankingRequest.category = await Category.findOne(
                  {
                    _id: post.category,
                  },
                  { title: 1, translate: 1 }
                );
                orderRankingRequest.brand = await Brand.findOne(
                  {
                    _id: post.brand,
                  },
                  { title: 1, translate: 1 }
                );
                orderRankingRequest.count = 1;
                orderRankingRequest.save();
              }

              var createObj = new Order();
              if (roomData.cardId) {
                const cardItem = await Card.findOne(
                  { _id: roomData.cardId },
                  { cardBrand: 1, maskedCardNo: 1 }
                );
                createObj.card = cardItem;
              }

              var image = "";
              createObj.user_id = roomData.user_id;
              createObj.paymentId = "";
              createObj.tranId = "";
              createObj.seller_id = post.user_id;
              createObj.post_id = post.id;
              createObj.order_number = orderNumber === 0 ? 1 : orderNumber + 1;
              createObj.order_number_show = `#00000${createObj.order_number}`;
              createObj.price = roomData.item.price;
              createObj.admin_commission = offer.item.serviceFees;
              createObj.seller_amount = offer.item.sellerPayout;
              createObj.paymentData = paymentData;
              createObj.discount_price = roomData.item.discount;
              createObj.shipping_fee = roomData.item.shipping_fee;
              createObj.processing_fee = roomData.item.processing_fee;
              createObj.payment_type = roomData.paymentType;
              createObj.payment_status = true;
              createObj.shipping_to = roomData.address;
              createObj.shipping_from = roomData.item.addresses;
              createObj.shipping = true;
              createObj.coupon_code = roomData.coupon;

              var match = { _id: new mongoose.Types.ObjectId(offer.post_id) };
              const postItem = await Post.aggregate([
                {
                  $lookup: {
                    from: "postimages",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "postimages",
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "users",
                  },
                },
                { $unwind: "$users" },
                {
                  $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categories",
                  },
                },
                {
                  $unwind: {
                    path: "$categories",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "brands",
                    localField: "brand",
                    foreignField: "_id",
                    as: "brands",
                  },
                },
                {
                  $unwind: {
                    path: "$brands",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "conditions",
                    localField: "condition",
                    foreignField: "_id",
                    as: "conditions",
                  },
                },
                { $unwind: "$conditions" },
                {
                  $lookup: {
                    from: "models",
                    localField: "brandModel",
                    foreignField: "_id",
                    as: "models",
                  },
                },
                {
                  $unwind: {
                    path: "$models",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $match: match,
                },
                {
                  $project: {
                    _id: 1,
                    created_at: 1,
                    title: 1,
                    description: 1,
                    price: 1,
                    shipping_fee: 1,
                    processing_fee: 1,
                    payment_type: 1,
                    shipping: 1,
                    who_pay: 1,
                    view: 1,
                    boot: 1,
                    item_information: 1,
                    "users.first_name": 1,
                    "users.last_name": 1,
                    "users.image": 1,
                    "categories.translate": 1,
                    "brands.translate": 1,
                    "conditions.translate": 1,
                    "models.translate": 1,
                    postimages: 1,
                    location: 1,
                    discountPrice: 1,
                  },
                },
              ]);
              if (postItem.length > 0) {
                createObj.item = postItem[0];
              }
              await Promise.map(postItem, async (item) => {
                await Promise.map(item.postimages, async (postImage) => {
                  image = await getPostImageUrl(postImage.title);
                });
              });
              createObj.item.price = roomData.item.price;
              createObj.item.discount_price = roomData.item.discount;
              createObj.item.shipping_fee = roomData.item.shipping_fee;
              createObj.item.processing_fee = roomData.item.processing_fee;
              createObj.item.payment = roomData.item.paymentMethod;
              const lastSavePost = await createObj.save();

              /**
               * Update order it
               */
              await ChatRoom.updateOne(
                { _id: room },
                { order_id: lastSavePost._id, orderCancelButton: true }
              );

              var orderId = lastSavePost._id;
              var sellerData = await User.findOne({
                _id: lastSavePost.seller_id,
              });
              var orderData = await Order.findOne({ _id: lastSavePost._id });

              /**
               * Create Shipment
               */
              var labelCreateRequest = {
                FromAddress: {
                  Line1: `${shippingFrom.apartment_name} ${shippingFrom.street_name}`,
                  Line2: `${shippingFrom.district}`,
                  Line3: "",
                  City: shippingFrom.city,
                  PostCode: shippingFrom.postal_code,
                },
                FromContact: {
                  PersonName: `${sellerData.first_name} ${sellerData.last_name}`,
                  CompanyName: `${sellerData.first_name} ${sellerData.last_name}`,
                  PhoneNumber: sellerData.mobile_number,
                },
                ToAddress: {
                  Line1: whereHouse.line1,
                  Line2: whereHouse.line2,
                  Line3: whereHouse.line3,
                  City: whereHouse.city,
                  PostCode: whereHouse.postCode,
                },
                ToContact: {
                  PersonName: process.env.PERSON_NAME,
                  CompanyName: process.env.COMPANY_NAME,
                  PhoneNumber: process.env.COMPANY_NUMBER,
                },
                PickupLocation: whereHouse.line1,
                pickUpTime: moment().add(3, "days").toISOString(),
                FromDateTime: moment().add(3, "days").valueOf(),
                OperatingInstruction: "OperatingInstruction...",
                Remarks: "SELLER-DOFFO",
                ShipmentRef: `${orderData.order_number_show}`,
                ShipperRef: `SELLER-DOFFO`,
                ConsigneeRef1: `#${await padLeadingZeros(post.postNumber, 10)}`,
                ConsigneeRef2: `-`,
                DescriptionOfGoods: `${post.title}`,
                OrderId: `${orderData.order_number}`,
                Dimensions: {
                  Length: post.item_information.length,
                  Width: post.item_information.width,
                  Height: post.item_information.height,
                },
                ActualWeight: post.item_information.weight,
              };

              offerService.createShippingLabelAramex(
                "LABEL_1",
                lastSavePost,
                "SELLER-DOFFO",
                labelCreateRequest
              );

              const roomDetails = await ChatRoom.findOne({
                _id: roomData._id,
              });

              /**
               * Create card for buyer
               */

              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomDetails.seller_id;
              chatMessageRequest.receiver = roomDetails.user_id;
              var itemRequest = roomDetails.item;
              itemRequest.orderId = orderId;
              itemRequest.order_step = "SELLER-DOFFO";

              var results = await Order.findOne({ _id: orderId });

              itemRequest.trackingNumber = results.trackingNumber1;
              chatMessageRequest.room = roomDetails._id;
              chatMessageRequest.status = false;
              chatMessageRequest.itemData = true;
              chatMessageRequest.type = "BUYER";
              chatMessageRequest.seller_status = "TRACK_ORDER";
              chatMessageRequest.buyer_status = "TRACK_ORDER";
              chatMessageRequest.item = itemRequest;
              chatMessageRequest.message = "";
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Create card for seller
               */
              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomDetails.user_id;
              chatMessageRequest.receiver = roomDetails.seller_id;
              chatMessageRequest.room = roomDetails._id;
              chatMessageRequest.status = false;
              chatMessageRequest.type = "SELLER";
              chatMessageRequest.seller_status = "PICK_UP";
              chatMessageRequest.buyer_status = "PICK_UP";
              chatMessageRequest.item = itemRequest;
              chatMessageRequest.message = "";
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Update trackingNumber on room
               */
              await ChatRoom.updateOne(
                { _id: roomDetails._id },
                {
                  trackingNumber1: results.trackingNumber1,
                  item: itemRequest,
                }
              );

              /**
               * Send email to admin
               */
              const adminUserData = await User.findOne(
                { role_id: 1 },
                { first_name: 1, last_name: 1, email: 1, language: 1 }
              );
              const UserData = await User.findOne(
                { _id: lastSavePost.user_id },
                { first_name: 1, last_name: 1, email: 1, language: 1 }
              );
              const SellerData = await User.findOne(
                { _id: lastSavePost.seller_id },
                {
                  first_name: 1,
                  last_name: 1,
                  email: 1,
                  language: 1,
                  device_token: 1,
                }
              );

              var options = await email_service.getEmailTemplateBySlug(
                "admin-purchases-item",
                adminUserData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${adminUserData.first_name} ${adminUserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[USER_NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.description = _.replace(
                options.description,
                "[IMAGE]",
                `${image}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[PRICE]",
                `${createObj.price}`
              );
              options.description = _.replace(
                options.description,
                "[DISCOUNT]",
                `${createObj.discount_price}`
              );
              options.description = _.replace(
                options.description,
                "[SHIPPING_FEE]",
                `${createObj.shipping_fee}`
              );

              options.description = _.replace(
                options.description,
                "[FINAL_PRICE]",
                `${(
                  createObj.price +
                  createObj.shipping_fee -
                  createObj.discount_price
                ).toFixed(2)}`
              );
              options.toEmail = adminUserData.email;
              sendMail(options);

              /**
               * Send notification to seller
               */
              var t = i18next.t;
              i18next.changeLanguage("en");

              var postNumber = await padLeadingZeros(post.postNumber, 10);
              var userName = `${UserData.first_name} ${UserData.last_name}`;
              var message = t("ITEM_ORDER", { postNumber, userName });

              var notification = {};
              notification.user = SellerData;
              notification.message = message;
              notification.title = t("ITEM_SOLD_NOTIFICATION");
              notification.link = `${process.env.BASE_URL}notification`;
              notification.isMail = true;
              sendNotification(notification);

              /**
               * Send to seller
               */
              var options = await email_service.getEmailTemplateBySlug(
                "admin-purchases-item",
                SellerData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${SellerData.first_name} ${SellerData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[USER_NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.description = _.replace(
                options.description,
                "[IMAGE]",
                `${image}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[PRICE]",
                `${createObj.price}`
              );
              options.description = _.replace(
                options.description,
                "[DISCOUNT]",
                `${createObj.discount_price}`
              );
              options.description = _.replace(
                options.description,
                "[SHIPPING_FEE]",
                `${createObj.shipping_fee}`
              );
              options.description = _.replace(
                options.description,
                "[PROCESSING_FEE]",
                `${createObj.processing_fee}`
              );
              options.description = _.replace(
                options.description,
                "[FINAL_PRICE]",
                `${(
                  createObj.price +
                  createObj.shipping_fee +
                  createObj.processing_fee -
                  createObj.discount_price
                ).toFixed(2)}`
              );
              options.toEmail = SellerData.email;
              sendMail(options);

              /**
               * Create invoice
               */
              var invoiceURl = `${
                process.env.INVOICE_URL + lastSavePost._id
              }&language=${UserData.language}`;
              var wkhtmltopdf = require("wkhtmltopdf");
              var fs = require("fs");
              await wkhtmltopdf(invoiceURl, { pageSize: "letter" }).pipe(
                await fs.createWriteStream(
                  "public/invoices/" + lastSavePost._id + ".pdf"
                )
              );

              /**
               * Send mail to customer
               */
              var options = await email_service.getEmailTemplateBySlug(
                "item-purchasing",
                UserData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.toEmail = UserData.email;
              options.attachments = [
                {
                  filename: lastSavePost._id + ".pdf",
                  path: "public/invoices/" + lastSavePost._id + ".pdf",
                },
              ];
              sendMailAttachments(options);
              await Post.updateOne(
                { _id: post._id },
                {
                  sold: true,
                  //boost: false,
                  soldDate: moment().toISOString(),
                  removeBuying: true,
                }
              );

              if (post.boostRequest) {
                if (
                  post.boostRequest.boot &&
                  post.boostRequest.boot.slug === "27-days-plan"
                ) {
                  // await Post.updateOne(
                  //   { _id: post._id },
                  //   {
                  //     sold: true,
                  //     boost: false,
                  //     boostRequest: {},
                  //     soldDate: moment().toISOString(),
                  //   }
                  // );
                  // await PurchaseBoot.updateOne(
                  //   { _id: post.boostRequest._id },
                  //   { status: false }
                  // );
                }
              }

              await Recommend.deleteMany({ post_id: post._id });
              await Favorite.deleteMany({ post_id: post._id });
            } else {
              io.sockets.in(requestData.user_id).emit("error", {
                message: setMessage("POST_SOLD", language),
              });
              return false;
            }
          }
        } else {
          if (
            roomData.paymentType === "ONLINE" ||
            roomData.paymentType === "CASH"
          ) {
            await ChatRoom.updateOne({ _id: room }, { status: "COMPLETED" });
            if (roomData.paymentType === "ONLINE") {
              var findPattern = {
                post_id: roomData.post_id,
                user_id: { $ne: roomData.user_id },
              };
              await offerService.soldMessage(findPattern);
            }
            const post = await Post.findOne({
              _id: offer.post_id,
              sold: false,
            });
            if (post) {
              var findOrder = await Order.findOne({
                "item._id": offer.post_id,
                status: { $ne: "CANCELED" },
              });
              if (findOrder) {
                io.sockets.in(requestData.user_id).emit("error", {
                  message: setMessage("OFFER_ACCEPT_OTHER", language),
                });
                return false;
              }

              /**
               * for buyer
               */
              var orderNumber = await Order.countDocuments();
              var message = `Order was placed successfully, Order ID: 00000${
                orderNumber === 0 ? 1 : orderNumber + 1
              }, You will be updated shortly`;
              var systemMessage = [
                { message: "ORDER_PLACED" },
                {
                  message: `Order ID: 00000${
                    orderNumber === 0 ? 1 : orderNumber + 1
                  }`,
                },
                { message: "ORDER_PLACED_UPDATE" },
              ];

              /**
               * Update offer
               */
              await ChatMessage.updateMany(
                {
                  room: new mongoose.Types.ObjectId(roomData._id),
                  expired: false,
                  seller_status: {
                    $nin: [
                      "CANCELED",
                      "SYSTEM_CARD",
                      "EXPIRED",
                      "SYSTEM_EXPIRED",
                    ],
                  },
                },
                { seller_status: "ACCEPTED", buyer_status: "ACCEPTED" }
              );

              /**
               * Get Accepted message list
               */
              var acceptedData = await ChatMessage.findOne(
                { room: roomData._id },
                { _id: 1 }
              ).sort({ _id: -1 });

              io.sockets.in(roomSocketId).emit("acceptedOffer", acceptedData);

              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              if (roomData.user_id.toString() === roomData.user_id) {
                var lastMessageSeller = "OFFER_ACCEPTED";
                var lastMessage = "OFFER_ACCEPTED";
                await updateOfferListing(socket, io, roomData.seller_id);
              }
              if (roomData.seller_id.toString() === data.user_id) {
                var lastMessageSeller = "OFFER_ACCEPTED";
                var lastMessage = "OFFER_ACCEPTED";
                await updateOfferListing(socket, io, roomData.seller_id);
              }
              await updateMessageCard(
                socket,
                io,
                roomData,
                data,
                lastMessageSeller,
                lastMessage
              );

              chatMessageRequest.sender = roomData.seller_id;
              chatMessageRequest.receiver = roomData.user_id;
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.status = false;
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.type = "BUYER";
              chatMessageRequest.item = {};
              chatMessageRequest.message = message;
              chatMessageRequest.systemMessage = systemMessage;
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();
              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               *  seller message
               */
              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomData.user_id;
              chatMessageRequest.receiver = roomData.seller_id;

              chatMessageRequest.room = roomData._id;
              chatMessageRequest.isCard = true;
              chatMessageRequest.status = false;
              chatMessageRequest.seller_status = "SYSTEM_CARD";
              chatMessageRequest.buyer_status = "SYSTEM_CARD";
              chatMessageRequest.type = "SELLER";
              chatMessageRequest.item = {};
              chatMessageRequest.message = message;
              chatMessageRequest.systemMessage = systemMessage;
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Check Order Ranking
               */
              var orderRanking = await OrderRanking.findOne(
                {
                  "category._id": post.category,
                  "brand._id": post.brand,
                },
                { count: 1 }
              );
              if (orderRanking) {
                var orderRankingRequest = {};
                orderRankingRequest.count = orderRanking.count + 1;
                await OrderRanking.updateOne(
                  { _id: orderRanking._id },
                  orderRankingRequest
                );
              } else {
                var orderRankingRequest = new OrderRanking();
                orderRankingRequest.category = await Category.findOne(
                  {
                    _id: post.category,
                  },
                  { title: 1, translate: 1 }
                );
                orderRankingRequest.brand = await Brand.findOne(
                  {
                    _id: post.brand,
                  },
                  { title: 1, translate: 1 }
                );
                orderRankingRequest.count = 1;
                orderRankingRequest.save();
              }

              var createObj = new Order();
              var image = "";
              createObj.user_id = roomData.user_id;
              createObj.paymentId = "";
              createObj.tranId = "";
              createObj.seller_id = post.user_id;
              createObj.post_id = post.id;
              createObj.order_number = orderNumber === 0 ? 1 : orderNumber + 1;
              createObj.order_number_show = `#00000${createObj.order_number}`;
              createObj.price = roomData.item.price;
              createObj.admin_commission = offer.item.serviceFees;
              createObj.seller_amount = offer.item.sellerPayout;

              createObj.discount_price = roomData.item.discount;
              createObj.shipping_fee = roomData.item.shipping_fee;
              createObj.processing_fee = roomData.item.processing_fee;
              createObj.payment_type = roomData.paymentType;
              createObj.shipping_to = roomData.address;
              createObj.shipping_from = roomData.item.addresses;
              createObj.shipping = false;
              createObj.coupon_code = roomData.coupon;
              var match = { _id: new mongoose.Types.ObjectId(offer.post_id) };

              const postItem = await Post.aggregate([
                {
                  $lookup: {
                    from: "postimages",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "postimages",
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "users",
                  },
                },
                { $unwind: "$users" },
                {
                  $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categories",
                  },
                },
                {
                  $unwind: {
                    path: "$categories",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "brands",
                    localField: "brand",
                    foreignField: "_id",
                    as: "brands",
                  },
                },
                {
                  $unwind: {
                    path: "$brands",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "conditions",
                    localField: "condition",
                    foreignField: "_id",
                    as: "conditions",
                  },
                },
                { $unwind: "$conditions" },
                {
                  $lookup: {
                    from: "models",
                    localField: "brandModel",
                    foreignField: "_id",
                    as: "models",
                  },
                },
                {
                  $unwind: {
                    path: "$models",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $match: match,
                },
                {
                  $project: {
                    _id: 1,
                    created_at: 1,
                    title: 1,
                    description: 1,
                    price: 1,
                    shipping_fee: 1,
                    processing_fee: 1,
                    payment_type: 1,
                    shipping: 1,
                    who_pay: 1,
                    view: 1,
                    boot: 1,
                    item_information: 1,
                    "users.first_name": 1,
                    "users.last_name": 1,
                    "users.image": 1,
                    "categories.translate": 1,
                    "brands.translate": 1,
                    "conditions.translate": 1,
                    "models.translate": 1,
                    postimages: 1,
                    location: 1,
                    discountPrice: 1,
                  },
                },
              ]);
              if (postItem.length > 0) {
                createObj.item = postItem[0];
              }
              await Promise.map(postItem, async (item) => {
                await Promise.map(item.postimages, async (postImage) => {
                  image = await getPostImageUrl(postImage.title);
                });
              });
              createObj.item.price = roomData.item.price;
              createObj.item.discount_price = roomData.item.discount;
              createObj.item.shipping_fee = roomData.item.shipping_fee;
              createObj.item.processing_fee = roomData.item.processing_fee;
              createObj.item.payment = roomData.item.paymentMethod;
              const lastSavePost = await createObj.save();

              /**
               * Update order it
               */
              await ChatRoom.updateOne(
                { _id: room },
                { order_id: lastSavePost._id, orderCancelButton: true }
              );

              /**
               * for seller
               */
              var orderNumber = await Order.countDocuments();
              var chatMessageRequest = new ChatMessage();
              chatMessageRequest.isCard = true;
              chatMessageRequest.sender = roomData.seller_id;
              chatMessageRequest.receiver = roomData.user_id;

              var itemRequest = roomData.item;
              itemRequest.orderId = lastSavePost._id;
              chatMessageRequest.room = roomData._id;
              chatMessageRequest.status = false;
              chatMessageRequest.type = "BUYER";
              chatMessageRequest.seller_status = "SET_MEET_UP_LOCATION";
              chatMessageRequest.buyer_status = "SET_MEET_UP_LOCATION";
              chatMessageRequest.item = itemRequest;
              chatMessageRequest.message = "";
              chatMessageRequest.lastDate = moment().toISOString();
              var lastMessage = await chatMessageRequest.save();

              var roomDataList = await ChatMessage.findOne({
                _id: lastMessage._id,
              });
              var itemData = [];
              var messageData = {};

              messageData.message = setMessage(roomDataList.message, "en");
              messageData.systemMessage = setSystemMessage(
                roomDataList.systemMessage,
                "en"
              );
              messageData.message_arabic = setMessage(
                roomDataList.message,
                "ar"
              );
              messageData.systemMessage_arabic = setSystemMessage(
                roomDataList.systemMessage,
                "ar"
              );
              messageData._id = roomDataList._id;
              messageData.seller_status = roomDataList.seller_status;
              messageData.buyer_status = roomDataList.buyer_status;
              messageData.item = roomDataList.item;
              messageData.sender = roomDataList.sender;
              messageData.receiver = roomDataList.receiver;
              messageData.type = roomDataList.type;
              messageData.isCard = roomDataList.isCard;
              messageData.offerCancel = roomDataList.offerCancel;
              messageData.date = date(roomDataList.created_at);
              messageData.time = time(roomDataList.created_at);
              itemData.push(messageData);
              io.sockets.in(room).emit("messageDetails", itemData);

              /**
               * Send all message
               */

              const roomDataItem = await ChatMessage.find({
                room: room,
                seller_status: { $ne: "CANCELED" },
              });
              var data = [];
              await Promise.map(roomDataItem, async (item) => {
                var obj = {};
                obj._id = item._id;
                obj.message = setMessage(item.message, "en");
                obj.systemMessage = setSystemMessage(item.systemMessage, "en");
                obj.message_arabic = setMessage(item.message, "ar");
                obj.systemMessage_arabic = setSystemMessage(
                  item.systemMessage,
                  "ar"
                );
                obj.seller_status = item.seller_status;
                obj.buyer_status = item.buyer_status;
                obj.item = item.item;
                obj.type = item.type;
                obj.meetUpPop = false;
                obj.isCard = item.isCard;
                obj.offerCancel = item.offerCancel;
                obj.item.paymentType = item.paymentType;
                obj.sender = item.sender;
                obj.receiver = item.receiver;
                obj.date = date(item.created_at);
                obj.time = time(item.created_at);
                data.push(obj);
              });

              io.sockets.in(room).emit("chat-details", data);

              /**
               * Send email to admin
               */
              const adminUserData = await User.findOne(
                { role_id: 1 },
                { first_name: 1, last_name: 1, email: 1, language: 1 }
              );
              const UserData = await User.findOne(
                { _id: lastSavePost.user_id },
                { first_name: 1, last_name: 1, email: 1, language: 1 }
              );
              const SellerData = await User.findOne(
                { _id: lastSavePost.seller_id },
                { first_name: 1, last_name: 1, email: 1, language: 1 }
              );

              var options = await email_service.getEmailTemplateBySlug(
                "admin-purchases-item",
                adminUserData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${adminUserData.first_name} ${adminUserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[USER_NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.description = _.replace(
                options.description,
                "[IMAGE]",
                `${image}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[PRICE]",
                `${createObj.price}`
              );
              options.description = _.replace(
                options.description,
                "[DISCOUNT]",
                `${createObj.discount_price}`
              );
              options.description = _.replace(
                options.description,
                "[SHIPPING_FEE]",
                `${createObj.shipping_fee}`
              );
              options.description = _.replace(
                options.description,
                "[PROCESSING_FEE]",
                `${createObj.processing_fee}`
              );
              options.description = _.replace(
                options.description,
                "[FINAL_PRICE]",
                `${(
                  createObj.price +
                  createObj.shipping_fee +
                  createObj.processing_fee -
                  createObj.discount_price
                ).toFixed(2)}`
              );
              options.toEmail = adminUserData.email;
              sendMail(options);

              /**
               * Send to seller
               */
              var options = await email_service.getEmailTemplateBySlug(
                "admin-purchases-item",
                SellerData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${SellerData.first_name} ${SellerData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[USER_NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.description = _.replace(
                options.description,
                "[IMAGE]",
                `${image}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[PRICE]",
                `${createObj.price}`
              );
              options.description = _.replace(
                options.description,
                "[DISCOUNT]",
                `${createObj.discount_price}`
              );
              options.description = _.replace(
                options.description,
                "[SHIPPING_FEE]",
                `${createObj.shipping_fee}`
              );
              options.description = _.replace(
                options.description,
                "[PROCESSING_FEE]",
                `${createObj.processing_fee}`
              );
              options.description = _.replace(
                options.description,
                "[FINAL_PRICE]",
                `${(
                  createObj.price +
                  createObj.shipping_fee +
                  createObj.processing_fee -
                  createObj.discount_price
                ).toFixed(2)}`
              );
              options.toEmail = SellerData.email;
              sendMail(options);

              /**
               * Create invoice
               */
              var invoiceURl = `${
                process.env.INVOICE_URL + lastSavePost._id
              }&language=${UserData.language}`;
              var wkhtmltopdf = require("wkhtmltopdf");
              var fs = require("fs");
              await wkhtmltopdf(invoiceURl, { pageSize: "letter" }).pipe(
                await fs.createWriteStream(
                  "public/invoices/" + lastSavePost._id + ".pdf"
                )
              );

              /**
               * Send mail to customer
               */
              var options = await email_service.getEmailTemplateBySlug(
                "item-purchasing",
                UserData.language
              );
              options.description = _.replace(
                options.description,
                "[NAME]",
                `${UserData.first_name} ${UserData.last_name}`
              );
              options.description = _.replace(
                options.description,
                "[ITEM_NAME]",
                `${post.title}`
              );
              options.description = _.replace(
                options.description,
                "[ORDER_NUMBER]",
                `${orderNumber}`
              );
              options.toEmail = UserData.email;
              options.attachments = [
                {
                  filename: lastSavePost._id + ".pdf",
                  path: "public/invoices/" + lastSavePost._id + ".pdf",
                },
              ];
              sendMailAttachments(options);
              await Post.updateOne(
                { _id: post._id },
                {
                  //sold: true,
                  boost: false,
                  //boostRequest: {},
                  soldDate: moment().toISOString(),
                }
              );

              if (post.boostRequest) {
                if (
                  post.boostRequest.boot &&
                  post.boostRequest.boot.slug === "27-days-plan"
                ) {
                  // await Post.updateOne(
                  //   { _id: post._id },
                  //   {
                  //     sold: true,
                  //     boost: false,
                  //     boostRequest: {},
                  //     soldDate: moment().toISOString(),
                  //   }
                  // );
                  // await PurchaseBoot.updateOne(
                  //   { _id: post.boostRequest._id },
                  //   { status: false }
                  // );
                }
              }

              await Recommend.deleteMany({ post_id: post._id });
              await Favorite.deleteMany({ post_id: post._id });
            } else {
              var findOrder = await Order.findOne({
                "item._id": offer.post_id,
                status: { $ne: "CANCELED" },
              });
              if (findOrder) {
                io.sockets.in(requestData.user_id).emit("error", {
                  message: setMessage("OFFER_ACCEPT_OTHER", language),
                });
                return false;
              } else {
                io.sockets.in(requestData.user_id).emit("error", {
                  message: setMessage("POST_SOLD", language),
                });
                return false;
              }
            }
          }
        }
      } else {
        io.sockets
          .in(roomSocketId)
          .emit("error", { message: "Room Not found." });
        return false;
      }

      /**
       * Send room Details
       */
      var roomData = await ChatRoom.findOne({ _id: room });
      if (roomData) {
        var offerCount = await Offer.countDocuments({
          room: room,
          expired: false,
        });
        const seller = await User.findOne(
          { _id: roomData.seller_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        const buyer = await User.findOne(
          { _id: roomData.user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        roomData.item.meetUp = roomData.item.meetUp ? true : false;
        roomData.item.shipping = roomData.shipping;
        const postData = await Post.findOne({ _id: roomData.post_id });
        var data = {
          room: room,
          seller: seller,
          orderCancelButton: roomData.orderCancelButton,
          order_id: roomData.order_id,
          buyer: buyer,
          buyNow: postData.buyNow,
          item: roomData.item,
          offerCount: roomData.buyNow ? 1 : offerCount,
        };
        io.sockets.in(roomSocketId).emit("room-details", data);
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(roomSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('create-shipping-label',"61c2cf2033e0333dc0cd60bc",{"order_id":"61c2eff285754302406d1dec","user_id":"61c1ae2f57ae2226b42892b9","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  createShippingLabel: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);

    try {
      const { order_id, language } = data;
      var type = 1;
      var orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }
      var key = `trackingNumber${type}`;
      if (orderData[key] == "") {
        var match = { _id: new mongoose.Types.ObjectId(order_id) };
        var OrderDetails = await Order.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $lookup: {
              from: "users",
              localField: "seller_id",
              foreignField: "_id",
              as: "sellers",
            },
          },
          { $unwind: "$sellers" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              shipping_from: 1,
              shipping_to: 1,
              item: 1,
              key: 1,
              "users.first_name": 1,
              "users.last_name": 1,
              "users.email": 1,
              "users.mobile_number": 1,
              "sellers.first_name": 1,
              "sellers.last_name": 1,
              "sellers.email": 1,
              "sellers.mobile_number": 1,
            },
          },
        ]);
        if (OrderDetails.length) {
          OrderDetails = OrderDetails[0];

          // Set ShipFrom Address

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Name =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Phone.Number =
            OrderDetails.sellers.mobile_number;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.EMailAddress =
            OrderDetails.sellers.email;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.AddressLine =
            [
              OrderDetails.shipping_from.apartment_name,
              OrderDetails.shipping_from.street_name,
            ];
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.City =
            ucFirst(OrderDetails.shipping_from.city);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.StateProvinceCode =
            "SA";
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.PostalCode =
            OrderDetails.shipping_from.postal_code;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.CountryCode =
            "SA";

          // Set ShipTo Address

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Name =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.users.last_name);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Phone.Number =
            OrderDetails.users.mobile_number;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.EMailAddress =
            OrderDetails.users.email;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.AddressLine =
            [
              OrderDetails.shipping_to.apartment_name &&
                OrderDetails.shipping_to.apartment_name,
              OrderDetails.shipping_to.street_name,
            ];
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.City =
            ucFirst(OrderDetails.shipping_to.city);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.StateProvinceCode =
            "SA";
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.PostalCode =
            OrderDetails.shipping_to.postal_code;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.CountryCode =
            "SA";

          /**
           * Weight
           */
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].PackageWeight.Weight =
            OrderDetails.item.item_information.weight.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].PackageWeight.UnitOfMeasurement.Code =
            "KGS";

          /**
           * Dimensions
           */
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Length =
            OrderDetails.item.item_information.length.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Width =
            OrderDetails.item.item_information.width.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Height =
            OrderDetails.item.item_information.height.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.UnitOfMeasurement.Code =
            "CM";

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].ReferenceNumber[0].Value =
            OrderDetails._id + "_0";
          try {
            console.log(
              "config.CREATE_SHIPMENT_REQUEST_OBJECT_SELLER ==>",
              JSON.stringify(config.CREATE_SHIPMENT_REQUEST_OBJECT)
            );
            var result = await getShippingAgent.post(
              "ship/v1/shipments",
              config.CREATE_SHIPMENT_REQUEST_OBJECT
            );
            var base64Data =
              result.data.ShipmentResponse.ShipmentResults.PackageResults
                .ShippingLabel.GraphicImage;
            var trackingNumber =
              result.data.ShipmentResponse.ShipmentResults.PackageResults
                .TrackingNumber;
            var order = {};
            order[key] = trackingNumber;
            var trackingNumberImage = `${config.TRACKING_PATH}${trackingNumber}.png`;
            await writeFileAsync(trackingNumberImage, base64Data, "base64");
            var Jimp = require("jimp");
            const image = await Jimp.read(trackingNumberImage);
            image.rotate(270).write(trackingNumberImage);
            await Order.updateOne({ _id: order_id }, order);

            io.sockets.in(userSocketId).emit("successfully", {
              message: setMessage("SHIPPING_LABEL_GRANT", language),
            });
          } catch (err) {
            if (err.response.status == 404) {
              console.log(err.response.statusText);
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.statusText,
              });
              return false;
            } else if (err.response.status == 400) {
              console.log(err.response.data.response.errors[0].message);
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.data.response.errors[0].message,
              });
              return false;
            } else {
              io.sockets
                .in(userSocketId)
                .emit("error", { message: err.message });
              return false;
            }
          }
        }
      }
      const results = await Order.findOne(
        { _id: order_id },
        { trackingNumber1: 1, _id: 1 }
      );
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      console.log(
        "roomDetails.trackingNumber1 ==>",
        roomDetails.trackingNumber1
      );

      if (!roomDetails.trackingNumber1) {
        /**
         * Update offer
         */
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "PRINT_LABEL" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );
        const roomData = await ChatRoom.findOne({ _id: room });
        var lastMessageSeller = "OFFER_RECEIVED";
        var lastMessage = "OFFER_SEND";

        if (roomDetails.user_id.toString() === data.user_id) {
          var lastMessageSeller = "Shipping Label generated";
          var lastMessage = "Shipping Label generated";
        }
        if (roomDetails.seller_id.toString() === data.user_id) {
          var lastMessageSeller = "Shipping Label generated";
          var lastMessage = "Shipping Label generated";
        }

        await updateMessageCard(
          socket,
          io,
          roomData,
          data,
          lastMessageSeller,
          lastMessage
        );

        /**
         * Create card for buyer
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        if (roomDetails.user_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.seller_id;
        }
        if (roomDetails.seller_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.user_id;
        }
        var itemRequest = roomDetails.item;
        itemRequest.orderId = results._id;

        itemRequest.trackingUrl = `${process.env.API_PATH}${config.TRACKING_IMAGE_PATH}/${results.trackingNumber1}.png`;
        itemRequest.trackingNumber = results.trackingNumber1;
        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.itemData = true;
        chatMessageRequest.type = "BUYER";
        chatMessageRequest.seller_status = "TRACK_ORDER";
        chatMessageRequest.buyer_status = "TRACK_ORDER";
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};

        messageData.message = setMessage(roomDataList.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataList.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        messageData._id = roomDataList._id;
        messageData.seller_status = roomDataList.seller_status;
        messageData.buyer_status = roomDataList.buyer_status;
        messageData.item = roomDataList.item;
        messageData.sender = roomDataList.sender;
        messageData.receiver = roomDataList.receiver;
        messageData.type = roomDataList.type;
        messageData.isCard = roomDataList.isCard;
        messageData.offerCancel = roomDataList.offerCancel;
        messageData.date = date(roomDataList.created_at);
        messageData.time = time(roomDataList.created_at);
        itemData.push(messageData);
        io.sockets.in(roomSocketId).emit("messageDetails", itemData);

        /**
         * Create card for seller
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        if (roomDetails.user_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.seller_id;
        }

        if (roomDetails.seller_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.user_id;
        }

        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.type = "SELLER";
        chatMessageRequest.seller_status = "PICK_UP";
        chatMessageRequest.buyer_status = "PICK_UP";
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};

        messageData.message = setMessage(roomDataList.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataList.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        messageData._id = roomDataList._id;
        messageData.seller_status = roomDataList.seller_status;
        messageData.buyer_status = roomDataList.buyer_status;
        messageData.item = roomDataList.item;
        messageData.sender = roomDataList.sender;
        messageData.receiver = roomDataList.receiver;
        messageData.type = roomDataList.type;
        messageData.isCard = roomDataList.isCard;
        messageData.offerCancel = roomDataList.offerCancel;
        messageData.date = date(roomDataList.created_at);
        messageData.time = time(roomDataList.created_at);
        itemData.push(messageData);
        io.sockets.in(roomSocketId).emit("messageDetails", itemData);

        /**
         * Update trackingNumber non room
         */
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { trackingNumber1: results.trackingNumber1, item: itemRequest }
        );
      } else {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("SHIPPING_LABEL_SORRY", language),
        });
        return false;
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('schedule-pick-up',"61c2cf2033e0333dc0cd60bc",{"order_id":"61c2eff285754302406d1dec","user_id":"61c1ae2f57ae2226b42892b9","pickup_date":"20130204","ready_time":"0830","close_time":"1500","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  schedulePickUp: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { order_id, language, pickup_date, ready_time, close_time } = data;
      var orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }
      var key = "prn1";
      if (orderData[key] == "") {
        var match = { _id: new mongoose.Types.ObjectId(order_id) };
        var OrderDetails = await Order.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $lookup: {
              from: "users",
              localField: "seller_id",
              foreignField: "_id",
              as: "sellers",
            },
          },
          { $unwind: "$sellers" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              shipping_from: 1,
              shipping_to: 1,
              item: 1,
              key: 1,
              "users.first_name": 1,
              "users.last_name": 1,
              "users.email": 1,
              "users.mobile_number": 1,
              "sellers.first_name": 1,
              "sellers.last_name": 1,
              "sellers.email": 1,
              "sellers.mobile_number": 1,
            },
          },
        ]);
        if (OrderDetails.length) {
          OrderDetails = OrderDetails[0];

          // Set ShipFrom Address
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.CloseTime =
            close_time;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.ReadyTime =
            ready_time;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.PickupDate =
            pickup_date;

          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.CompanyName =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.ContactName =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.EMailAddress =
            OrderDetails.sellers.email;

          (config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.AddressLine =
            OrderDetails.shipping_from.apartment_name),
            +OrderDetails.shipping_from.street_name;

          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.City =
            ucFirst(OrderDetails.shipping_from.city);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.StateProvinceCode =
            "SA";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.PostalCode =
            OrderDetails.shipping_from.postal_code;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.CountryCode =
            "SA";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.ResidentialIndicator =
            "Y";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.Phone.Number =
            OrderDetails.sellers.mobile_number;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.SpecialInstruction =
            "";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.ReferenceNumber =
            "";

          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.TotalWeight.Weight =
            OrderDetails.item.item_information.weight.toString();

          try {
            var result = await getShippingAgent.post(
              "ship/v1/pickups",
              config.CREATE_PICKUP_REQUEST_OBJECT
            );
            console.log(
              "config.CREATE_PICKUP_REQUEST_OBJECT ==>",
              JSON.stringify(config.CREATE_PICKUP_REQUEST_OBJECT)
            );

            var order = {};
            order[key] = result.data.PickupCreationResponse.PRN;
            await Order.updateOne({ _id: order_id }, order);
          } catch (err) {
            if (err.response.status == 404) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.statusText,
              });
              return false;
            } else if (err.response.status == 400) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.data.response.errors[0].message,
              });
              return false;
            } else {
              io.sockets
                .in(userSocketId)
                .emit("error", { message: err.message });
              return false;
            }
          }
        }
      }
      const results = await Order.findOne(
        { _id: order_id },
        { trackingNumber1: 1, _id: 1, prn1: 1 }
      );
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });

      /**
       * Get Accepted message list
       */
      var acceptedData = await ChatMessage.findOne(
        { room: roomDetails._id },
        { _id: 1 }
      ).sort({ _id: -1 });

      io.sockets.in(roomSocketId).emit("acceptedOffer", acceptedData);

      if (!roomDetails.prn1) {
        /**
         * Update offer
         */
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "PICK_UP" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );

        const roomData = await ChatRoom.findOne({ _id: roomDetails._id });
        var lastMessageSeller = "OFFER_RECEIVED";
        var lastMessage = "OFFER_SEND";

        if (roomDetails.user_id.toString() === data.user_id) {
          var lastMessageSeller = "PickUp Scheduled";
          var lastMessage = "PickUp Scheduled";
        }
        if (roomDetails.seller_id.toString() === data.user_id) {
          var lastMessageSeller = "PickUp Scheduled";
          var lastMessage = "PickUp Scheduled";
        }

        await updateMessageCard(
          socket,
          io,
          roomData,
          data,
          lastMessageSeller,
          lastMessage
        );

        var itemRequest = roomDetails.item;
        var pickRequest = {};
        pickRequest.pickup_date = pickup_date;
        pickRequest.ready_time = ready_time;
        pickRequest.close_time = close_time;
        pickRequest.prn1 = results.prn1;
        itemRequest.prn1 = results.prn1;
        itemRequest.pickRequest = pickRequest;

        /**
         * Create card for seller
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        if (roomDetails.user_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.seller_id;
        }
        if (roomDetails.seller_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.user_id;
        }

        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.type = "SELLER";
        chatMessageRequest.seller_status = "PICK_UP_DONE";
        chatMessageRequest.buyer_status = "PICK_UP_DONE";
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};

        messageData.message = setMessage(roomDataList.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataList.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        messageData._id = roomDataList._id;
        messageData.seller_status = roomDataList.seller_status;
        messageData.buyer_status = roomDataList.buyer_status;
        messageData.item = roomDataList.item;
        messageData.sender = roomDataList.sender;
        messageData.receiver = roomDataList.receiver;
        messageData.type = roomDataList.type;
        messageData.isCard = roomDataList.isCard;
        messageData.offerCancel = roomDataList.offerCancel;
        messageData.date = date(roomDataList.created_at);
        messageData.time = time(roomDataList.created_at);
        itemData.push(messageData);
        io.sockets.in(roomSocketId).emit("messageDetails", itemData);

        /**
         * Update trackingNumber non room
         */
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { prn1: results.prn1, item: itemRequest }
        );
        io.sockets.in(userSocketId).emit("successfully", {
          message: setMessage("PICKUP_LABEL_GRANT", language),
        });
      } else {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("PICK_UP_LABEL_SORRY", language),
        });
        return false;
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * socket.emit('confirm-order-yes',"61c45396ade0ad3dd0d1dada",{"user_id":"61c1ae2f57ae2226b42892b9","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  confirmOrder: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { language } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      socket.join(roomDetails.user_id);
      socket.join(roomDetails.seller_id);

      const orderData = await Order.findOne({ _id: roomDetails.order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }

      await Order.updateOne(
        { _id: orderData._id },
        {
          item_accept: true,
          is_review: true,
          status: "DELIVERED",
          seller_status: "DELIVERED",
          admin_status: "COMPLETED",
        }
      );

      /**
       * Remove Doffo boost
       */
      var post = await Post.findOne({ _id: roomDetails.post_id });
      await Post.updateOne({ _id: post._id }, { boost: false });
      if (post.boostRequest) {
        if (
          post.boostRequest.boot &&
          post.boostRequest.boot.slug === "27-days-plan"
        ) {
          await Post.updateOne(
            { _id: post._id },
            {
              sold: true,
              boost: false,
              boostRequest: {},
              soldDate: moment().toISOString(),
            }
          );
          await PurchaseBoot.updateOne(
            { _id: post.boostRequest._id },
            { status: false }
          );
        }
      }

      /**
       * Update amount on wallet
       */
      if (!orderData.onWallet) {
        if (orderData.payment_type === "ONLINE") {
          /**
           * Save Data on wallet
           */
          var createPattern = {
            user_id: orderData.seller_id,
            amount: orderData.seller_amount,
            type: "CREDIT",
            remark: `Credit from order ${orderData.order_number_show}`,
          };
          await walletService.saveRecord(createPattern);
          await Order.updateOne(
            { _id: orderData._id },
            { onWallet: true, item_accept: true, is_review: true }
          );
        }
      }

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "CONFIRM_ITEM" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      /**
       * buyer message
       */
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.buyerNotificationCount =
        roomDetails.buyerNotificationCount + 1;
      updateRequest.lastMessage = "Submit Review";
      updateRequest.lastDate = moment().toISOString();
      await ChatRoom.updateOne({ _id: roomDetails._id }, updateRequest);

      var itemRequest = roomDetails.item;

      /**
       * Create card for buyer
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      if (roomDetails.user_id.toString() === data.user_id) {
        chatMessageRequest.receiver = data.user_id;
        chatMessageRequest.sender = roomDetails.seller_id;
      }

      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();
      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("ORDER_CONFORMATION", language),
      });

      var roomDataList = await ChatMessage.findOne({
        _id: lastMessage._id,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomDetails.user_id).emit("messageDetails", itemData);

      /**
       * buyer message
       */
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.sellerNotificationCount =
        roomDetails.sellerNotificationCount + 1;
      updateRequest.lastDate = moment().toISOString();
      updateRequest.lastMessageSeller = "Submit Review";
      await ChatRoom.updateOne({ _id: roomDetails._id }, updateRequest);

      /**
       * Create card for seller
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      if (roomDetails.user_id.toString() === data.user_id) {
        chatMessageRequest.receiver = roomDetails.seller_id;
        chatMessageRequest.sender = data.user_id;
      }

      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        _id: lastMessage._id,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomDetails.seller_id).emit("messageDetails", itemData);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * socket.emit('confirm-meet-up',"61c99ede1f136a32f83ee17e",{"user_id":"61c1ae2f57ae2226b42892b9","language":"en"})
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  confirmMeetLocation: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { language } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      socket.join(roomDetails.user_id);
      socket.join(roomDetails.seller_id);
      var requestData = data;

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "CONFIRM_LOCATION" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "CONFIRM_MEET_UP_LOCATION" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      /**
       * Update room last message
       */
      const roomList = await ChatRoom.findOne({ _id: roomSocketId });
      if (roomList.user_id.toString() === requestData.user_id) {
        var lastMessageSeller = "Confirmed location";
        var lastMessage = "Confirmed location";
      }
      if (roomList.seller_id.toString() === requestData.user_id) {
        var lastMessageSeller = "Confirmed location";
        var lastMessage = "Confirmed location";
      }
      await updateMessageCard(
        socket,
        io,
        roomList,
        data,
        lastMessageSeller,
        lastMessage
      );

      var itemRequest = roomDetails.item;
      itemRequest.payment_type = roomDetails.paymentType;

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("LOCATION_CONFIRM", language),
      });

      /**
       * CONFIRM_LOCATION card for both
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = data.user_id;
      chatMessageRequest.sender = roomDetails.seller_id;
      chatMessageRequest.type = "BOTH";
      chatMessageRequest.seller_status = "CONFIRM_LOCATION";
      chatMessageRequest.buyer_status = "CONFIRM_LOCATION";
      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();

      var roomDataListArray = await ChatMessage.find({
        room: roomSocketId,
        seller_status: { $ne: "CANCELED" },
      });

      var itemData = [];
      await Promise.map(roomDataListArray, async (item) => {
        var obj = {};
        obj._id = item._id;
        obj.message = setMessage(item.message, "en");
        obj.systemMessage = setSystemMessage(item.systemMessage, "en");
        obj.message_arabic = setMessage(item.message, "ar");
        obj.systemMessage_arabic = setSystemMessage(item.systemMessage, "ar");
        obj.seller_status = item.seller_status;
        obj.buyer_status = item.buyer_status;
        obj.item = item.item;
        obj.type = item.type;
        obj.meetUpPop = false;
        obj.isCard = item.isCard;
        obj.offerCancel = item.offerCancel;
        obj.item.paymentType = item.paymentType;
        obj.sender = item.sender;
        obj.receiver = item.receiver;
        obj.date = date(item.created_at);
        obj.time = time(item.created_at);
        itemData.push(obj);
      });
      io.sockets.in(roomSocketId).emit("chat-details", itemData);

      if (roomDetails.paymentType === "ONLINE") {
        /**
         * create card for pay payment
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        chatMessageRequest.receiver = roomDetails.user_id;
        chatMessageRequest.sender = roomDetails.seller_id;
        chatMessageRequest.type = "BUYER";
        chatMessageRequest.seller_status = "PAY_HERE";
        chatMessageRequest.buyer_status = "PAY_HERE";
        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};
        messageData.message = setMessage(roomDataList.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataList.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        messageData._id = roomDataList._id;
        messageData.seller_status = roomDataList.seller_status;
        messageData.buyer_status = roomDataList.buyer_status;
        messageData.item = roomDataList.item;
        messageData.sender = roomDataList.sender;
        messageData.receiver = roomDataList.receiver;
        messageData.type = roomDataList.type;
        messageData.isCard = roomDataList.isCard;
        messageData.offerCancel = roomDataList.offerCancel;
        messageData.date = date(roomDataList.created_at);
        messageData.time = time(roomDataList.created_at);
        itemData.push(messageData);
        io.sockets.in(roomSocketId).emit("messageDetails", itemData);
      }

      /**
       * Send room Details
       */
      const roomData = await ChatRoom.findOne({ _id: roomSocketId });
      if (roomData) {
        var offerCount = await Offer.countDocuments({
          room: roomSocketId,
          expired: false,
        });
        const seller = await User.findOne(
          { _id: roomData.seller_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        const buyer = await User.findOne(
          { _id: roomData.user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        roomData.item.meetUp = roomData.item.meetUp ? true : false;
        roomData.item.shipping = roomData.shipping;
        const postData = await Post.findOne({ _id: roomData.post_id });
        var data = {
          room: roomSocketId,
          seller: seller,
          orderCancelButton: roomData.orderCancelButton,
          order_id: roomData.order_id,
          buyer: buyer,
          buyNow: postData.buyNow,
          item: roomData.item,
          offerCount: roomData.buyNow ? 1 : offerCount,
        };
        io.sockets.in(roomSocketId).emit("room-details", data);
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * socket.emit('room-refresh',"61c99ede1f136a32f83ee17e",{"user_id":"61c1ae2f57ae2226b42892b9"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  roomReFresh: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { language } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId }).sort({
        _id: -1,
      });
      if (!roomDetails) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ROOM_DATA_NOT", language),
        });
        return false;
      }

      socket.join(roomDetails.user_id);
      socket.join(roomDetails.seller_id);

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("MEET_ADDRESS_CREATED", language),
      });

      const roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('paymentConfirm',"61c99ede1f136a32f83ee17e",{"order_id":"61c9ac607b1bc81fb4bf58dd","tranId":"123","paymentId":"123","cardId":"61bae670a5dadd47b44745cf","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  paymentConfirm: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    socket.join(roomSocketId);
    try {
      const {
        order_id,
        tranId,
        paymentId,
        cardId,
        language,
        user_id,
        useWallet,
      } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      socket.join(roomDetails.user_id);
      socket.join(roomDetails.seller_id);
      const orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }

      var offer = await Offer.findOne({ room: room });
      if (useWallet === "true") {
        var walletAmount = await walletService.getAmount({
          user_id: user_id,
        });

        var offerUpdateRequest = {};

        offerUpdateRequest.walletUse = true;
        if (walletAmount > offer.item.total) {
          offerUpdateRequest.wallet_amount = offer.item.total;
        } else {
          offerUpdateRequest.wallet_amount = walletAmount;
        }

        await Offer.updateOne({ _id: offer._id }, offerUpdateRequest);
      }

      await ChatRoom.updateOne(
        { _id: roomSocketId },
        { orderCancelButton: false }
      );

      /**
       * Update payment
       */
      var updateRequest = {};
      updateRequest.paymentId = paymentId;
      updateRequest.tranId = tranId;
      updateRequest.payment_status = true;
      if (cardId) {
        const cardItem = await Card.findOne(
          { _id: cardId },
          { cardBrand: 1, maskedCardNo: 1 }
        );
        updateRequest.card = cardItem;
      }
      await Order.updateOne({ _id: orderData._id }, updateRequest);
      var roomData = await ChatRoom.findOne({ order_id: order_id });
      offer = await Offer.findOne({ room: room });

      if (offer.walletUse) {
        if (walletAmount < offer.wallet_amount) {
          var lastMessage = "WALLET_AMOUNT";
          var lastMessageSeller = "WALLET_AMOUNT";
          await updateOfferListing(socket, io, roomData.user_id);
          await Offer.updateOne(
            { room: roomData._id },
            { expired: true, status: "CANCELED" }
          );
          await ChatRoom.updateOne(
            { _id: roomData._id },
            { expired: true, orderCancelButton: false }
          );

          io.sockets.in(roomSocketId).emit("successfully", {
            message: setMessage("OFFER_CANCEL", language),
          });

          /**
           * Create expired card
           */

          var lastMessageSeller = "Offer Canceled";
          var lastMessage = "Offer Canceled";
          await updateMessageCard(
            socket,
            io,
            roomData,
            data,
            lastMessageSeller,
            lastMessage
          );

          /**
           * Update message
           */
          await ChatMessage.updateMany(
            { room: roomData._id, seller_status: "PAY_HERE" },
            { seller_status: "CANCELED", buyer_status: "CANCELED" }
          );

          /**
           * Create chat history Expired
           */
          var chatMessageRequest = new ChatMessage();
          chatMessageRequest.isCard = true;
          chatMessageRequest.sender = roomData.seller_id;
          chatMessageRequest.receiver = roomData.user_id;
          chatMessageRequest.room = roomData._id;
          chatMessageRequest.item = roomData.item;
          chatMessageRequest.itemData = false;
          chatMessageRequest.status = false;
          chatMessageRequest.expired = true;
          chatMessageRequest.type = "BUYER";
          chatMessageRequest.message = "LOW_AMOUNT_BUYER";
          chatMessageRequest.seller_status = "SYSTEM_CARD";
          chatMessageRequest.buyer_status = "SYSTEM_CARD";
          chatMessageRequest.lastDate = moment().toISOString();
          var lastMessage = await chatMessageRequest.save();

          var chatMessageRequest = new ChatMessage();
          chatMessageRequest.isCard = true;
          chatMessageRequest.sender = roomData.user_id;
          chatMessageRequest.receiver = roomData.seller_id;
          chatMessageRequest.room = roomData._id;
          chatMessageRequest.item = roomData.item;
          chatMessageRequest.itemData = false;
          chatMessageRequest.status = false;
          chatMessageRequest.expired = true;
          chatMessageRequest.type = "SELLER";
          chatMessageRequest.message = "LOW_AMOUNT_SELLER";
          chatMessageRequest.seller_status = "SYSTEM_CARD";
          chatMessageRequest.buyer_status = "SYSTEM_CARD";
          chatMessageRequest.lastDate = moment().toISOString();
          var lastMessage = await chatMessageRequest.save();

          const roomDataArray = await ChatMessage.find({
            room: roomData._id,
            seller_status: { $ne: "CANCELED" },
          });

          var meetUpPop = false;
          var data = [];
          await Promise.map(roomDataArray, async (item) => {
            var obj = {};
            obj._id = item._id;
            obj.message = setMessage(item.message, "en");
            obj.systemMessage = setSystemMessage(item.systemMessage, "en");
            obj.message_arabic = setMessage(item.message, "ar");
            obj.systemMessage_arabic = setSystemMessage(
              item.systemMessage,
              "ar"
            );
            obj.seller_status = item.seller_status;
            obj.buyer_status = item.buyer_status;
            obj.item = item.item;
            obj.type = item.type;
            obj.meetUpPop = meetUpPop;
            obj.isCard = item.isCard;
            obj.offerCancel = item.offerCancel;
            obj.item.paymentType = roomData.paymentType;
            obj.sender = item.sender;
            obj.receiver = item.receiver;
            obj.date = date(item.created_at);
            obj.time = time(item.created_at);
            data.push(obj);
          });
          io.sockets.in(roomSocketId).emit("chat-details", data);
          return false;
        } else if (offer.wallet_amount != 0) {
          var createPattern = {
            user_id: roomData.user_id,
            amount: offer.wallet_amount,
            type: "DEBIT",
            remark: `Buy for product`,
          };
          await walletService.saveRecord(createPattern);
        }
      }

      /**
       * Update amount on wallet
       */
      if (!orderData.onWallet) {
        if (orderData.payment_type === "ONLINE") {
          /**
           * Save Data on wallet
           */
          var createPattern = {
            user_id: orderData.seller_id,
            amount: orderData.seller_amount,
            type: "CREDIT",
            remark: `Credit from order ${orderData.order_number_show}`,
          };
          await walletService.saveRecord(createPattern);
          await Order.updateOne({ _id: orderData._id }, { onWallet: true });
        }
      }

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomData._id, seller_status: "PAY_HERE" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      /**
       * Create review card
       */

      var itemRequest = roomData.item;
      itemRequest.paymentId = paymentId;
      itemRequest.tranId = tranId;

      /**
       * update last message
       */
      const roomList = await ChatRoom.findOne({ _id: room });
      var lastMessageSeller = "Submit Review";
      var lastMessage = "Submit Review";
      await updateMessageCard(
        socket,
        io,
        roomList,
        data,
        lastMessageSeller,
        lastMessage
      );

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("PAYMENT_DONE", language),
      });

      await Post.updateOne(
        { _id: roomData.post_id },
        {
          sold: true,
          boost: false,
          soldDate: moment().toISOString(),
          removeBuying: true,
        }
      );

      /**
       * Remove Doffo boost
       */
      var post = await Post.findOne({ _id: roomData.post_id });
      if (post.boostRequest) {
        if (
          post.boostRequest.boot &&
          post.boostRequest.boot.slug === "27-days-plan"
        ) {
          await Post.updateOne(
            { _id: post._id },
            {
              sold: true,
              boost: false,
              boostRequest: {},
              soldDate: moment().toISOString(),
            }
          );
          await PurchaseBoot.updateOne(
            { _id: post.boostRequest._id },
            { status: false }
          );
        }
      }

      /**
       * Create card for payAmount buyer
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomData.user_id;
      chatMessageRequest.sender = roomData.seller_id;
      chatMessageRequest.room = roomData._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.seller_status = "SHOW_PAY_HERE_BUYER";
      chatMessageRequest.buyer_status = "SHOW_PAY_HERE_BUYER";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });

      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Create card for buyer
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomData.user_id;
      chatMessageRequest.sender = roomData.seller_id;

      chatMessageRequest.room = roomData._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });

      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Create card for payAmount seller
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomData.seller_id;
      chatMessageRequest.sender = roomData.user_id;

      chatMessageRequest.room = roomData._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.seller_status = "SHOW_PAY_HERE_SELLER";
      chatMessageRequest.buyer_status = "SHOW_PAY_HERE_SELLER";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Create card for seller
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomData.seller_id;
      chatMessageRequest.sender = roomData.user_id;

      chatMessageRequest.room = roomData._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Send notification
       */
      if (roomData.user_id.toString() === user_id) {
        var user = await User.findOne({ _id: roomData.seller_id });
        var buyerUser = await User.findOne(
          { _id: user_id },
          { first_name: 1, last_name: 1 }
        );
        if (user.notification) {
          var message = `${buyerUser.first_name} ${
            buyerUser.last_name
          } ${setMessage("PAYMENT_MEAD_MESSAGE", user.language)}`;
          var title = setMessage("PAYMENT_MEAD", user.language);
          var request = {};
          request.user = user;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          sendPushNotification(request);
        }
      }
      if (roomData.seller_id.toString() === user_id) {
        var user = await User.findOne({ _id: roomData.user_id });
        var buyerUser = await User.findOne(
          { _id: roomData.seller_id },
          { first_name: 1, last_name: 1 }
        );
        if (user.notification) {
          var message = `${buyerUser.first_name} ${
            buyerUser.last_name
          } ${setMessage("PAYMENT_MEAD_MESSAGE", user.language)}`;
          var title = setMessage("PAYMENT_MEAD", user.language);
          var request = {};
          request.user = user;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          sendPushNotification(request);
        }
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('reject-request',"61c99ede1f136a32f83ee17e",{"request_id":"61cc38d411da2a0d24940cc0","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  rejectRequest: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { request_id, language } = data;
      const returnRequest = await ReturnRequest.findOne({ _id: request_id });
      if (!returnRequest) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("DATA_NOT_FOUND", language),
        });
        return false;
      }

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "RETURN_REQUEST" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      var updateRequest = {};
      updateRequest.request = "CANCEL_SELLER";
      await ReturnRequest.updateOne({ _id: request_id }, updateRequest);

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("RETURN_CANCEL", language),
      });

      var roomDataInfo = await ChatRoom.findOne({ _id: roomSocketId });
      const orderData = await Order.findOne({ _id: roomDataInfo.order_id });
      if (!orderData.onWallet) {
        if (orderData.payment_type === "ONLINE") {
          /**
           * Save Data on wallet
           */
          var createPattern = {
            user_id: orderData.seller_id,
            amount: orderData.seller_amount,
            type: "CREDIT",
            remark: `Credit from order ${orderData.order_number_show}`,
          };
          await walletService.saveRecord(createPattern);
          await Order.updateOne({ _id: orderData._id }, { onWallet: true });
        }
      }

      await Order.updateOne(
        { _id: orderData.order_id },
        {
          shipping_return: shipping_return,
          status: "RETURN_PROCESSING",
          seller_status: "RETURN_PROCESSING",
          admin_status: "RETURN_ACTION_REQUIRED",
        }
      );

      /**
       * Remove Doffo boost
       */
      var post = await Post.findOne({ _id: roomDataInfo.post_id });
      await Post.updateOne({ _id: post._id }, { boost: false });
      if (post.boostRequest) {
        if (
          post.boostRequest.boot &&
          post.boostRequest.boot.slug === "27-days-plan"
        ) {
          await Post.updateOne(
            { _id: post._id },
            {
              sold: true,
              boost: false,
              boostRequest: {},
              soldDate: moment().toISOString(),
            }
          );
          await PurchaseBoot.updateOne(
            { _id: post.boostRequest._id },
            { status: false }
          );
        }
      }

      /**
       * Create review card
       */

      var itemRequest = roomDataInfo.item;

      /**
       * update lsat message
       */
      const roomData = await ChatRoom.findOne({ _id: roomSocketId });
      var lastMessageSeller = "Submit Review";
      var lastMessage = "Submit Review";
      await updateMessageCard(
        socket,
        io,
        roomData,
        data,
        lastMessageSeller,
        lastMessage
      );

      /**
       * For buyer
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomDataInfo.user_id;
      chatMessageRequest.sender = roomDataInfo.seller_id;
      chatMessageRequest.room = roomDataInfo._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      /**
       * For seller
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.receiver = roomDataInfo.seller_id;
      chatMessageRequest.sender = roomDataInfo.user_id;
      chatMessageRequest.room = roomDataInfo._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.seller_status = "REVIEW";
      chatMessageRequest.buyer_status = "REVIEW";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      /**
       * send notification
       */
      var user = await User.findOne({ _id: roomDataInfo.user_id });
      if (user.notification) {
        var message = `${setMessage("RETURN_REQUEST_CANCEL", user.language)} ${
          returnRequest.item.title
        }.`;
        var title = setMessage("RETURN_REQUEST_TITLE", user.language);
        var request = {};
        request.user = user;
        request.message = message;
        request.title = title;
        request.type = "HOME";
        request.roomId = "";
        request.orderId = "";
        sendPushNotification(request);

        var message = `${setMessage("REVIEW_MESSAGE", user.language)} ${
          returnRequest.item.title
        }.`;
        var title = setMessage("REVIEW_TITLE", user.language);
        var request = {};
        request.user = user;
        request.message = message;
        request.title = title;
        request.type = "CHAT";
        request.roomId = roomDataInfo._id;
        request.orderId = "";
        sendPushNotification(request);
      }

      var seller = await User.findOne({ _id: roomDataInfo.seller_id });
      if (seller.notification) {
        var message = `${setMessage("REVIEW_MESSAGE", seller.language)} ${
          returnRequest.item.title
        }.`;
        var title = setMessage("REVIEW_TITLE", seller.language);
        var request = {};
        request.user = seller;
        request.message = message;
        request.title = title;
        request.type = "CHAT";
        request.roomId = roomDataInfo._id;
        request.orderId = "";
        sendPushNotification(request);
      }

      /**
       * Send email & notification for admin
       */
      var adminData = await User.findOne({ role_id: 1 });
      var message = `${seller.first_name} ${seller.last_name} ${setMessage(
        "RETURN_REQUEST_MESSAGE_REJECT",
        adminData.language
      )} "${itemRequest.title}" ${setMessage(
        "PLEASE_CHECK",
        adminData.language
      )}`;

      var notification = {};
      notification.user = adminData;
      notification.message = message;
      notification.title = setMessage("NEW_NOTIFICATION", adminData.language);
      notification.link = `${process.env.BASE_URL}notification`;
      notification.isMail = true;
      sendNotification(notification);

      /**
       * send last message on room
       */

      const roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('accept-request',"61c99ede1f136a32f83ee17e",{"request_id":"61cc38d411da2a0d24940cc0","user_id":"61c1ae2f57ae2226b42892b9","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  acceptRequest: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { request_id, language } = data;

      const returnRequest = await ReturnRequest.findOne({ _id: request_id });
      if (!returnRequest) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("DATA_NOT_FOUND", language),
        });
        return false;
      }

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "RETURN_REQUEST" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      var updateRequest = {};
      updateRequest.request = "ACCEPT_SELLER";
      await ReturnRequest.updateOne({ _id: request_id }, updateRequest);

      /**
       * find order
       */
      var orderData = await Order.findOne({ _id: returnRequest.order_id });
      var match = {
        _id: new mongoose.Types.ObjectId(returnRequest.order_id),
      };
      var OrderDetails = await Order.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "users",
          },
        },
        { $unwind: "$users" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "sellers",
          },
        },
        { $unwind: "$sellers" },
        {
          $match: match,
        },
        {
          $project: {
            _id: 1,
            shipping_from: 1,
            shipping_to: 1,
            item: 1,
            key: 1,
            order_number: 1,
            order_number_show: 1,
            "users.first_name": 1,
            "users.last_name": 1,
            "users.email": 1,
            "users.mobile_number": 1,
            "sellers.first_name": 1,
            "sellers.last_name": 1,
            "sellers.email": 1,
            "sellers.mobile_number": 1,
          },
        },
      ]);

      var order_id = returnRequest.order_id;
      await Order.updateOne(
        { _id: orderData._id },
        {
          status: "RETURN_ON_ROUTE",
          seller_status: "RETURN_ON_ROUTE",
          admin_status: "RETURN_PROCESSING",
          order_step: "BUYER-SELLER",
        }
      );

      OrderDetails = OrderDetails[0];

      /**
       * Create ShippingLabel for BUYER-SELLER
       */

      var labelCreateRequest = {
        FromAddress: {
          Line1: `${OrderDetails.shipping_to.apartment_name} ${OrderDetails.shipping_to.street_name}`,
          Line2: `${OrderDetails.shipping_to.district}`,
          Line3: "",
          City: OrderDetails.shipping_to.city,
          PostCode: OrderDetails.shipping_to.postal_code,
        },
        FromContact: {
          PersonName: `${OrderDetails.users.first_name} ${OrderDetails.users.last_name}`,
          CompanyName: `${OrderDetails.users.first_name} ${OrderDetails.users.last_name}`,
          PhoneNumber: OrderDetails.users.mobile_number,
        },
        ToAddress: {
          Line1: `${OrderDetails.shipping_to.apartment_name} ${OrderDetails.shipping_to.street_name}`,
          Line2: `${OrderDetails.shipping_to.district}`,
          Line3: "",
          City: OrderDetails.shipping_to.city,
          PostCode: OrderDetails.shipping_to.postal_code,
        },
        ToContact: {
          PersonName: `${OrderDetails.sellers.first_name} ${OrderDetails.sellers.last_name}`,
          CompanyName: `${OrderDetails.sellers.first_name} ${OrderDetails.sellers.last_name}`,
          PhoneNumber: OrderDetails.sellers.mobile_number,
        },
        PickupLocation: OrderDetails.shipping_to.formatted_address,
        pickUpTime: moment().add(3, "days").toISOString(),
        FromDateTime: moment().add(3, "days").valueOf(),
        OperatingInstruction: "OperatingInstruction...",
        Remarks: "SELLER-DOFFO",
        ShipmentRef: `${OrderDetails.order_number_show}`,
        ShipperRef: `SELLER-DOFFO`,
        ConsigneeRef1: `#${await padLeadingZeros(
          OrderDetails.item.postNumber,
          10
        )}`,
        ConsigneeRef2: `-`,
        DescriptionOfGoods: `${OrderDetails.item.title}`,
        OrderId: `${OrderDetails.order_number}`,
        Dimensions: {
          Length: OrderDetails.item.item_information.length,
          Width: OrderDetails.item.item_information.width,
          Height: OrderDetails.item.item_information.height,
        },
        ActualWeight: OrderDetails.item.item_information.weight,
      };

      offerService.createShippingLabelAramex(
        "LABEL_3",
        orderData,
        "BUYER-SELLER",
        labelCreateRequest
      );

      const results = await Order.findOne(
        { _id: order_id },
        { trackingNumber2: 1, _id: 1 }
      );

      if (orderData.shipping_return === "SELLER") {
        /**
         * DEBIT ON WALLET
         */
        var createPattern = {
          user_id: orderData.seller_id,
          amount: orderData.shipping_fee,
          type: "DEBIT",
          remark: `Debit from order ${orderData.order_number_show}`,
        };
        await walletService.saveRecord(createPattern);
      }

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("RETURN_ACCEPT", language),
      });

      var roomDataInfo = await ChatRoom.findOne({ _id: roomSocketId });

      /**
       * update last message
       */
      const roomData = await ChatRoom.findOne({ _id: roomSocketId });
      var lastMessageSeller = "Shipping Label generated";
      var lastMessage = "Shipping Label generated";
      await updateMessageCard(
        socket,
        io,
        roomData,
        data,
        lastMessageSeller,
        lastMessage
      );

      /**
       * Create card buyer
       */

      var itemRequest = roomDataInfo.item;
      itemRequest.order_step = "BUYER-SELLER";

      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.sender = roomDataInfo.seller_id;
      chatMessageRequest.receiver = roomDataInfo.user_id;
      chatMessageRequest.room = roomDataInfo._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.seller_status = "PICK_UP_BUYER";
      chatMessageRequest.buyer_status = "PICK_UP_BUYER";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "";
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      await ChatRoom.updateOne(
        { _id: roomSocketId },
        { trackingNumber2: results.trackingNumber2, item: itemRequest }
      );

      /**
       * send notification
       */
      var user = await User.findOne({ _id: roomDataInfo.user_id });
      if (user.notification) {
        var message = `${setMessage("RETURN_REQUEST_ACCEPT", user.language)} ${
          returnRequest.item.title
        }.`;
        var title = setMessage("RETURN_REQUEST_TITLE", user.language);

        var request = {};
        request.user = user;
        request.message = message;
        request.title = title;
        request.type = "CHAT";
        request.roomId = roomDataInfo._id;
        request.orderId = "";
        sendPushNotification(request);
      }

      var seller = await User.findOne({ _id: roomDataInfo.seller_id });

      /**
       * Send email & notification for admin
       */
      var adminData = await User.findOne({ role_id: 1 });
      var message = `${seller.first_name} ${seller.last_name} ${setMessage(
        "RETURN_REQUEST_MESSAGE_ACCEPT",
        adminData.language
      )} "${itemRequest.title}" ${setMessage(
        "PLEASE_CHECK",
        adminData.language
      )}`;

      var notification = {};
      notification.user = adminData;
      notification.message = message;
      notification.title = setMessage("NEW_NOTIFICATION", adminData.language);
      notification.link = `${process.env.BASE_URL}notification`;
      notification.isMail = true;
      sendNotification(notification);

      /**
       * send last message on room
       */

      const roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Create card seller
       */
      var systemMessage = [{ message: "RETURN_REQUEST_ACCEPTED" }];
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.sender = roomDataInfo.user_id;
      chatMessageRequest.receiver = roomDataInfo.seller_id;
      chatMessageRequest.room = roomDataInfo._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.seller_status = "SYSTEM_CARD";
      chatMessageRequest.buyer_status = "SYSTEM_CARD";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "RETURN_REQUEST_ACCEPTED";
      chatMessageRequest.systemMessage = systemMessage;
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      /**
       * send last message on room
       */

      var roomDataListLast = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });
      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataListLast.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataListLast.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataListLast.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataListLast.systemMessage,
        "ar"
      );

      messageData._id = roomDataListLast._id;
      messageData.seller_status = roomDataListLast.seller_status;
      messageData.buyer_status = roomDataListLast.buyer_status;
      messageData.item = roomDataListLast.item;
      messageData.sender = roomDataListLast.sender;
      messageData.receiver = roomDataListLast.receiver;
      messageData.type = roomDataListLast.type;
      messageData.isCard = roomDataListLast.isCard;
      messageData.offerCancel = roomDataListLast.offerCancel;
      messageData.date = date(roomDataListLast.created_at);
      messageData.time = time(roomDataListLast.created_at);
      itemData.push(messageData);

      io.sockets.in(roomSocketId).emit("messageDetails", itemData);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('create-shipping-label-buyer',"61cd8f7be37e711f60444ec5",{"order_id":"61cd8fe7e37e711f60444eca","user_id":"61c1ae2f57ae2226b42892b9","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  createShippingLabelBuyer: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { order_id, language } = data;
      var type = 2;
      var orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }
      var key = `trackingNumber${type}`;
      if (orderData[key] == "") {
        var match = { _id: new mongoose.Types.ObjectId(order_id) };
        var OrderDetails = await Order.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $lookup: {
              from: "users",
              localField: "seller_id",
              foreignField: "_id",
              as: "sellers",
            },
          },
          { $unwind: "$sellers" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              shipping_from: 1,
              shipping_to: 1,
              item: 1,
              key: 1,
              "users.first_name": 1,
              "users.last_name": 1,
              "users.email": 1,
              "users.mobile_number": 1,
              "sellers.first_name": 1,
              "sellers.last_name": 1,
              "sellers.email": 1,
              "sellers.mobile_number": 1,
            },
          },
        ]);
        if (OrderDetails.length) {
          OrderDetails = OrderDetails[0];

          // Set ShipFrom Address

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Name =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.users.last_name);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Phone.Number =
            OrderDetails.users.mobile_number;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.EMailAddress =
            OrderDetails.users.email;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.AddressLine =
            [
              OrderDetails.shipping_to.apartment_name,
              OrderDetails.shipping_to.street_name,
            ];
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.City =
            ucFirst(OrderDetails.shipping_to.city);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.StateProvinceCode =
            "SA";
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.PostalCode =
            OrderDetails.shipping_to.postal_code;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipFrom.Address.CountryCode =
            "SA";

          // Set ShipTo Address

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Name =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Phone.Number =
            OrderDetails.sellers.mobile_number;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.EMailAddress =
            OrderDetails.sellers.email;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.AddressLine =
            [
              OrderDetails.shipping_to.apartment_name &&
                OrderDetails.shipping_to.apartment_name,
              OrderDetails.shipping_from.street_name,
            ];
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.City =
            ucFirst(OrderDetails.shipping_from.city);
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.StateProvinceCode =
            "SA";
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.PostalCode =
            OrderDetails.shipping_from.postal_code;
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.ShipTo.Address.CountryCode =
            "SA";

          /**
           * Weight
           */
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].PackageWeight.Weight =
            OrderDetails.item.item_information.weight.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].PackageWeight.UnitOfMeasurement.Code =
            "KGS";

          /**
           * Dimensions
           */
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Length =
            OrderDetails.item.item_information.length.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Width =
            OrderDetails.item.item_information.width.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.Height =
            OrderDetails.item.item_information.height.toString();
          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].Dimensions.UnitOfMeasurement.Code =
            "CM";

          config.CREATE_SHIPMENT_REQUEST_OBJECT.ShipmentRequest.Shipment.Package[0].ReferenceNumber[0].Value =
            OrderDetails._id + "_0";

          try {
            console.log(
              "config.CREATE_SHIPMENT_REQUEST_OBJECT ==>",
              JSON.stringify(config.CREATE_SHIPMENT_REQUEST_OBJECT)
            );
            var result = await getShippingAgent.post(
              "ship/v1/shipments",
              config.CREATE_SHIPMENT_REQUEST_OBJECT
            );
            var base64Data =
              result.data.ShipmentResponse.ShipmentResults.PackageResults
                .ShippingLabel.GraphicImage;
            var trackingNumber =
              result.data.ShipmentResponse.ShipmentResults.PackageResults
                .TrackingNumber;
            var order = {};
            order[key] = trackingNumber;
            var trackingNumberImage = `${config.TRACKING_PATH}${trackingNumber}.png`;
            await writeFileAsync(trackingNumberImage, base64Data, "base64");
            var Jimp = require("jimp");
            const image = await Jimp.read(trackingNumberImage);
            image.rotate(270).write(trackingNumberImage);
            await Order.updateOne({ _id: order_id }, order);

            io.sockets.in(userSocketId).emit("successfully", {
              message: setMessage("SHIPPING_LABEL_GRANT", language),
            });
          } catch (err) {
            if (err.response.status == 404) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.statusText,
              });
              return false;
            } else if (err.response.status == 400) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.data.response.errors[0].message,
              });
              return false;
            } else {
              io.sockets
                .in(userSocketId)
                .emit("error", { message: err.message });
              return false;
            }
          }
        }
      }

      const results = await Order.findOne(
        { _id: order_id },
        { trackingNumber2: 1, _id: 1 }
      );
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      if (!roomDetails.trackingNumber2) {
        /**
         * Update offer
         */
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "CONFIRM_MEET_UP_LOCATION" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "PRINT_LABEL_BUYER" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );

        /**
         * Update last message
         */
        const roomData = await ChatRoom.findOne({ _id: roomSocketId });
        var lastMessageSeller = "Shipping Label generated";
        var lastMessage = "Shipping Label generated";
        await updateMessageCard(
          socket,
          io,
          roomData,
          data,
          lastMessageSeller,
          lastMessage
        );

        /**
         * Create card for buyer
         */
        var itemRequest = roomDetails.item;
        itemRequest.trackingUrl2 = `${process.env.API_PATH}${config.TRACKING_IMAGE_PATH}/${results.trackingNumber2}.png`;
        itemRequest.trackingUrl = `${process.env.API_PATH}${config.TRACKING_IMAGE_PATH}/${results.trackingNumber2}.png`;
        itemRequest.trackingNumber2 = results.trackingNumber2;
        itemRequest.trackingNumber = results.trackingNumber2;

        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        chatMessageRequest.sender = roomDetails.seller_id;
        chatMessageRequest.receiver = roomDetails.user_id;
        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.type = "BUYER";
        chatMessageRequest.seller_status = "PICK_UP_BUYER";
        chatMessageRequest.buyer_status = "PICK_UP_BUYER";
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataList = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};

        messageData.message = setMessage(roomDataList.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataList.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataList.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataList.systemMessage,
          "ar"
        );
        messageData._id = roomDataList._id;
        messageData.seller_status = roomDataList.seller_status;
        messageData.buyer_status = roomDataList.buyer_status;
        messageData.item = roomDataList.item;
        messageData.sender = roomDataList.sender;
        messageData.receiver = roomDataList.receiver;
        messageData.type = roomDataList.type;
        messageData.isCard = roomDataList.isCard;
        messageData.offerCancel = roomDataList.offerCancel;
        messageData.date = date(roomDataList.created_at);
        messageData.time = time(roomDataList.created_at);
        itemData.push(messageData);
        io.sockets.in(roomSocketId).emit("messageDetails", itemData);

        /**
         * Update trackingNumber non room
         */
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { trackingNumber2: results.trackingNumber2, item: itemRequest }
        );
      } else {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("SHIPPING_LABEL_SORRY", language),
        });
        return false;
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('schedule-pick-up',"61c2cf2033e0333dc0cd60bc",{"order_id":"61c2eff285754302406d1dec","user_id":"61c1ae2f57ae2226b42892b9","pickup_date":"20130204","ready_time":"0830","close_time":"1500","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  schedulePickUpBuyer: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { order_id, language, pickup_date, ready_time, close_time } = data;
      var orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }
      var key = "prn2";
      if (orderData[key] == "") {
        var match = { _id: new mongoose.Types.ObjectId(order_id) };
        var OrderDetails = await Order.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $lookup: {
              from: "users",
              localField: "seller_id",
              foreignField: "_id",
              as: "sellers",
            },
          },
          { $unwind: "$sellers" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              shipping_from: 1,
              shipping_to: 1,
              item: 1,
              key: 1,
              "users.first_name": 1,
              "users.last_name": 1,
              "users.email": 1,
              "users.mobile_number": 1,
              "sellers.first_name": 1,
              "sellers.last_name": 1,
              "sellers.email": 1,
              "sellers.mobile_number": 1,
            },
          },
        ]);
        if (OrderDetails.length) {
          OrderDetails = OrderDetails[0];

          // Set ShipFrom Address
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.CloseTime =
            close_time;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.ReadyTime =
            ready_time;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupDateInfo.PickupDate =
            pickup_date;

          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.CompanyName =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.ContactName =
            ucFirst(OrderDetails.users.first_name) +
            " " +
            ucFirst(OrderDetails.sellers.last_name);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.EMailAddress =
            OrderDetails.sellers.email;
          (config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.AddressLine =
            OrderDetails.shipping_from.apartment_name),
            +OrderDetails.shipping_from.street_name;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.City =
            ucFirst(OrderDetails.shipping_from.city);
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.StateProvinceCode =
            "SA";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.PostalCode =
            OrderDetails.shipping_from.postal_code;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.CountryCode =
            "SA";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.ResidentialIndicator =
            "Y";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.PickupAddress.Phone.Number =
            OrderDetails.sellers.mobile_number;
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.SpecialInstruction =
            "";
          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.ReferenceNumber =
            "";

          config.CREATE_PICKUP_REQUEST_OBJECT.PickupCreationRequest.TotalWeight.Weight =
            OrderDetails.item.item_information.weight.toString();

          try {
            var result = await getShippingAgent.post(
              "ship/v1/pickups",
              config.CREATE_PICKUP_REQUEST_OBJECT
            );
            var order = {};
            order[key] = result.data.PickupCreationResponse.PRN;

            await Order.updateOne({ _id: order_id }, order);
          } catch (err) {
            if (err.response.status == 404) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.statusText,
              });
              return false;
            } else if (err.response.status == 400) {
              io.sockets.in(userSocketId).emit("error", {
                message: err.response.data.response.errors[0].message,
              });
              return false;
            } else {
              io.sockets
                .in(userSocketId)
                .emit("error", { message: err.message });
              return false;
            }
          }
        }
      }
      const results = await Order.findOne(
        { _id: order_id },
        { trackingNumber2: 1, _id: 1, prn2: 1 }
      );
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });

      /**
       * Get Accepted message list
       */
      var acceptedData = await ChatMessage.findOne(
        { room: roomDetails._id },
        { _id: 1 }
      ).sort({ _id: -1 });

      io.sockets.in(roomSocketId).emit("acceptedOffer", acceptedData);

      if (!roomDetails.prn2) {
        /**
         * Update last message
         */
        const roomData = await ChatRoom.findOne({ _id: roomSocketId });
        var lastMessageSeller = "Pickup Scheduled";
        var lastMessage = "Pickup Scheduled";
        await updateMessageCard(
          socket,
          io,
          roomData,
          data,
          lastMessageSeller,
          lastMessage
        );

        /**
         * Update offer
         */
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "PRINT_LABEL_BUYER" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );

        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "PICK_UP_BUYER" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );

        var itemRequest = roomDetails.item;
        var pickRequest = {};
        pickRequest.pickup_date = pickup_date;
        pickRequest.ready_time = ready_time;
        pickRequest.close_time = close_time;
        pickRequest.prn2 = results.prn2;
        itemRequest.prn2 = results.prn2;
        itemRequest.pickRequest = pickRequest;

        /**
         * Create card for seller
         */
        var chatMessageRequest = new ChatMessage();
        chatMessageRequest.isCard = true;
        if (roomDetails.user_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.seller_id;
        }
        if (roomDetails.seller_id.toString() === data.user_id) {
          chatMessageRequest.sender = data.user_id;
          chatMessageRequest.receiver = roomDetails.user_id;
        }

        chatMessageRequest.room = roomDetails._id;
        chatMessageRequest.status = false;
        chatMessageRequest.type = "BUYER";
        chatMessageRequest.seller_status = "PICK_UP_DONE";
        chatMessageRequest.buyer_status = "PICK_UP_DONE";
        chatMessageRequest.item = itemRequest;
        chatMessageRequest.message = "";
        chatMessageRequest.lastDate = moment().toISOString();
        var lastMessage = await chatMessageRequest.save();

        var roomDataListData = await ChatMessage.findOne({
          _id: lastMessage._id,
        });
        var itemData = [];
        var messageData = {};

        messageData.message = setMessage(roomDataListData.message, "en");
        messageData.systemMessage = setSystemMessage(
          roomDataListData.systemMessage,
          "en"
        );
        messageData.message_arabic = setMessage(roomDataListData.message, "ar");
        messageData.systemMessage_arabic = setSystemMessage(
          roomDataListData.systemMessage,
          "ar"
        );
        messageData._id = roomDataListData._id;
        messageData.seller_status = roomDataListData.seller_status;
        messageData.buyer_status = roomDataListData.buyer_status;
        messageData.item = roomDataListData.item;
        messageData.sender = roomDataListData.sender;
        messageData.receiver = roomDataListData.receiver;
        messageData.type = roomDataListData.type;
        messageData.isCard = roomDataListData.isCard;
        messageData.offerCancel = roomDataListData.offerCancel;
        messageData.date = date(roomDataListData.created_at);
        messageData.time = time(roomDataListData.created_at);
        itemData.push(messageData);
        //io.sockets.in(roomSocketId).emit("messageDetails", itemData);

        /**
         * Update trackingNumber non room
         */
        await ChatRoom.updateOne(
          { _id: roomSocketId },
          { prn2: results.prn2, item: itemRequest }
        );
        io.sockets.in(userSocketId).emit("successfully", {
          message: setMessage("PICKUP_LABEL_GRANT", language),
        });
      } else {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("PICK_UP_LABEL_SORRY", language),
        });
        return false;
      }
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   *
   * socket.emit('return-received',"61cd8f7be37e711f60444ec5",{"order_id":"61cd8fe7e37e711f60444eca","language":"en","type":"YES","reason":"test"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  returnReceivedSeller: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { language, type } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId }).sort({
        _id: -1,
      });
      if (!roomDetails) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ROOM_DATA_NOT", language),
        });
        return false;
      }
      socket.join(roomDetails.user_id);
      socket.join(roomDetails.seller_id);

      if (type === "NO") {
        await ChatRoom.updateOne(
          { _id: roomDetails._id },
          { received_reason: data.reason }
        );

        await Offer.Order(
          { room: data.order_id },
          { admin_status: "RETURN_ACTION_REQUIRED_REJECT" }
        );
      }

      /**
       * update last message
       */
      const roomLastMessage = await ChatRoom.findOne({ _id: room });
      var lastMessageSeller = setMessage("THANKS_MESSAGE", language);
      var lastMessage = setMessage("THANKS_MESSAGE", language);
      await updateMessageCard(
        socket,
        io,
        roomLastMessage,
        data,
        lastMessageSeller,
        lastMessage
      );

      /**
       * Update message
       */
      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "RETURN_ITEM_RECEIVED_BUYER" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      await ChatMessage.updateMany(
        { room: roomSocketId, seller_status: "RETURN_ITEM_RECEIVED_SELLER" },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      var systemMessage = [{ message: setMessage("THANKS_MESSAGE", language) }];
      var itemRequest = roomDetails.item;
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.sender = roomDetails.seller_id;
      chatMessageRequest.receiver = roomDetails.user_id;
      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.type = "BOTH";
      chatMessageRequest.seller_status = "SYSTEM_CARD";
      chatMessageRequest.buyer_status = "SYSTEM_CARD";
      chatMessageRequest.item = itemRequest;
      chatMessageRequest.message = "THANKS_MESSAGE";
      chatMessageRequest.systemMessage = systemMessage;
      chatMessageRequest.lastDate = moment().toISOString();
      await chatMessageRequest.save();

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("THANKS_MESSAGE", language),
      });

      const roomDataList = await ChatMessage.findOne({
        room: roomSocketId,
      }).sort({
        _id: -1,
      });

      var itemData = [];
      var messageData = {};
      messageData.message = setMessage(roomDataList.message, "en");
      messageData.systemMessage = setSystemMessage(
        roomDataList.systemMessage,
        "en"
      );
      messageData.message_arabic = setMessage(roomDataList.message, "ar");
      messageData.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      messageData._id = roomDataList._id;
      messageData.seller_status = roomDataList.seller_status;
      messageData.buyer_status = roomDataList.buyer_status;
      messageData.item = roomDataList.item;
      messageData.sender = roomDataList.sender;
      messageData.receiver = roomDataList.receiver;
      messageData.type = roomDataList.type;
      messageData.isCard = roomDataList.isCard;
      messageData.offerCancel = roomDataList.offerCancel;
      messageData.date = date(roomDataList.created_at);
      messageData.time = time(roomDataList.created_at);
      itemData.push(messageData);
      io.sockets.in(roomSocketId).emit("messageDetails", itemData);

      /**
       * Send notification to admin
       */
      var seller = await User.findOne({ _id: roomDetails.seller_id });
      var adminData = await User.findOne({ role_id: 1 });
      if (data.type === "YES") {
        var message = `${seller.first_name} ${seller.last_name} ${setMessage(
          "ITEM_RECEIVED_YES",
          adminData.language
        )} "${itemRequest.title}"`;
      } else {
        var message = `${seller.first_name} ${seller.last_name} ${setMessage(
          "ITEM_RECEIVED_NO",
          adminData.language
        )} "${itemRequest.title}"`;
      }
      var notification = {};
      notification.user = adminData;
      notification.message = message;
      notification.title = setMessage("NEW_NOTIFICATION", adminData.language);
      notification.link = `${process.env.BASE_URL}notification`;
      notification.isMail = true;
      sendNotification(notification);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('order-canceled',"61cd8f7be37e711f60444ec6",{"order_id":"61d55d9a4b1b9a40c8f6c2dd","user_id":"61c1ae2f57ae2226b42892b9","language":"en","description":""});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  orderCanceled: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    var requestData = data;

    try {
      const { language, order_id, description } = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      if (!roomDetails) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ROOM_DATA_NOT", language),
        });
        return false;
      }

      await Offer.updateOne(
        { room: roomDetails._id },
        { expired: true, status: "CANCELED" }
      );
      await ChatRoom.updateOne(
        { _id: roomDetails._id },
        { expired: true, orderCancelButton: false }
      );

      if (roomDetails.user_id.toString() === requestData.user_id) {
        var lastMessageSeller = "OFFER_RECEIVED";
        var lastMessage = "OFFER_SEND";
        await updateOfferListing(socket, io, roomDetails.seller_id);
      }
      if (roomDetails.seller_id.toString() === requestData.user_id) {
        var lastMessage = "OFFER_RECEIVED";
        var lastMessageSeller = "OFFER_SEND";
        await updateOfferListing(socket, io, roomDetails.user_id);
      }

      /**
       * update post
       */
      const postData = await Post.findOne({ _id: roomDetails.post_id });
      if (postData) {
        if (
          postData.boostRequest &&
          postData.boostRequest.boot &&
          postData.boostRequest.boot.slug === "27-days-plan"
        ) {
          await Post.updateOne({ _id: roomDetails.post_id }, { boost: true });
        }
      }
      await Post.updateOne({ _id: roomDetails.post_id }, { sold: false });
      const orderData = await Order.findOne({ _id: order_id });
      if (!orderData) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ORDER_NOT_FOUND", language),
        });
        return false;
      }
      await Offer.updateOne({ room: roomSocketId }, { expired: true });

      var systemMessage = [
        { message: "ORDER_CANCEL_SELLER" },
        { message: `Reason: ${description}` },
      ];

      /**
       * update on offer & chat room
       */
      await ChatRoom.updateOne(
        { _id: roomSocketId },
        { status: "CANCELED", orderCancelButton: false }
      );
      var offerRequest = await Offer.findOne(
        { room: roomSocketId },
        { _id: 1, post_id: 1, user_id: 1 }
      );
      if (offerRequest) {
        await OfferHistory.deleteMany({ offer_id: offerRequest._id });
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "SET_MEET_UP_LOCATION" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "CONFIRM_MEET_UP_LOCATION" },
          { seller_status: "CANCELED", buyer_status: "CANCELED" }
        );
        await ChatMessage.updateMany(
          { room: roomSocketId, seller_status: "CONFIRM_LOCATION" },
          {
            seller_status: "CONFIRM_LOCATION_CANCELED",
            buyer_status: "CONFIRM_LOCATION_CANCELED",
          }
        );
      }
      await Order.updateOne({ _id: orderData._id }, { status: "CANCELED" });

      var findPattern = {
        post_id: offerRequest.post_id,
        user_id: { $ne: offerRequest.user_id },
      };
      offerService.cancelOrderMessage(findPattern);

      /**
       * Send notification for seller when buyer cancel order
       */
      var user = await User.findOne({ _id: orderData.user_id });
      var seller = await User.findOne({ _id: orderData.seller_id });

      var message = `${seller.first_name} ${seller.last_name} ${setMessage(
        "CANCEL_ORDER",
        seller.language
      )} #00000${orderData.order_number} ${setMessage(
        "PLEASE_CHECK",
        user.language
      )}`;

      var title = setMessage("SOLD_TILE", user.language);
      var request = {};
      request.user = user;
      request.message = message;
      request.title = title;
      request.type = "ORDER_TRACK_DETAIL";
      request.roomId = "";
      request.orderId = orderData._id;
      sendPushNotification(request);

      /**
       * Send email to seller
       */
      var options = await email_service.getEmailTemplateBySlug(
        "order-canceled",
        seller.language
      );
      options.description = _.replace(
        options.description,
        "[NAME]",
        `${seller.first_name} ${seller.last_name}`
      );
      options.description = _.replace(
        options.description,
        "[BUYER_NAME]",
        `${user.first_name} ${user.last_name}`
      );
      options.description = _.replace(
        options.description,
        "[ORDER_NUMBER]",
        `${orderData.order_number_show}`
      );

      options.toEmail = seller.email;
      sendMail(options);

      /**
       * Send email & notification for admin
       */
      var adminData = await User.findOne({ role_id: 1 });
      var options = await email_service.getEmailTemplateBySlug(
        "order-canceled",
        adminData.language
      );
      options.description = _.replace(
        options.description,
        "[NAME]",
        `${adminData.first_name} ${adminData.last_name}`
      );
      options.description = _.replace(
        options.description,
        "[BUYER_NAME]",
        `${user.first_name} ${user.last_name}`
      );
      options.description = _.replace(
        options.description,
        "[ORDER_NUMBER]",
        `${orderData.order_number_show}`
      );

      options.toEmail = adminData.email;
      sendMail(options);

      await createZohoTicketNumber(
        user,
        "Order Canceled",
        description,
        orderData._id
      );

      /**
       * Send room Details
       */
      var roomDetailsData = await ChatRoom.findOne({ _id: room });
      if (roomDetailsData) {
        var offerCount = await Offer.countDocuments({
          room: room,
          expired: false,
        });
        const seller = await User.findOne(
          { _id: roomDetailsData.seller_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        const buyer = await User.findOne(
          { _id: roomDetailsData.user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        roomDetailsData.item.meetUp = roomDetailsData.item.meetUp
          ? true
          : false;
        roomDetailsData.item.shipping = roomDetailsData.shipping;
        const postData = await Post.findOne({ _id: roomDetailsData.post_id });
        var dataRequest = {
          room: room,
          seller: seller,
          orderCancelButton: roomDetailsData.orderCancelButton,
          order_id: roomDetailsData.order_id,
          buyer: buyer,
          buyNow: postData.buyNow,
          item: roomDetailsData.item,
          offerCount: roomDetailsData.buyNow ? 1 : offerCount,
        };
        io.sockets.in(roomSocketId).emit("room-details", dataRequest);
      }

      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;

      /**
       * Update last message
       */
      const roomLastMessage = await ChatRoom.findOne({ _id: room });
      var lastMessageSeller = "Order Canceled";
      var lastMessage = "Order Canceled";
      await updateMessageCard(
        socket,
        io,
        roomLastMessage,
        data,
        lastMessageSeller,
        lastMessage
      );

      chatMessageRequest.sender = roomDetails.seller_id;
      chatMessageRequest.receiver = roomDetails.user_id;
      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.seller_status = "SYSTEM_CARD";
      chatMessageRequest.buyer_status = "SYSTEM_CARD";
      chatMessageRequest.type = "BUYER";
      chatMessageRequest.item = {};
      chatMessageRequest.message = "ORDER_CANCEL_SELLER";
      chatMessageRequest.systemMessage = systemMessage;
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();

      var roomDataList = await ChatMessage.findOne({
        _id: lastMessage._id,
      });
      var itemData = [];
      var data = {};
      data.message = setMessage(roomDataList.message, "en");
      data.systemMessage = setSystemMessage(roomDataList.systemMessage, "en");
      data.message_arabic = setMessage(roomDataList.message, "ar");
      data.systemMessage_arabic = setSystemMessage(
        roomDataList.systemMessage,
        "ar"
      );
      data._id = roomDataList._id;
      data.seller_status = roomDataList.seller_status;
      data.buyer_status = roomDataList.buyer_status;
      data.item = roomDataList.item;
      data.type = roomDataList.type;
      data.isCard = roomDataList.isCard;
      data.offerCancel = roomDataList.offerCancel;
      data.sender = roomDataList.sender;
      data.receiver = roomDataList.receiver;
      data.offerCancel = roomDataList.offerCancel;
      data.date = date(roomDataList.created_at);
      data.time = time(roomDataList.created_at);
      itemData.push(data);
      io.sockets.in(room).emit("messageDetails", itemData);

      /**
       * Send message for seller
       */

      var systemMessage = [{ message: "ORDER_CANCEL_MESSAGE" }];
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      chatMessageRequest.sender = roomDetails.user_id;
      chatMessageRequest.receiver = roomDetails.seller_id;
      chatMessageRequest.room = roomDetails._id;
      chatMessageRequest.status = false;
      chatMessageRequest.seller_status = "SYSTEM_CARD";
      chatMessageRequest.buyer_status = "SYSTEM_CARD";
      chatMessageRequest.type = "SELLER";
      chatMessageRequest.item = {};
      chatMessageRequest.message = "ORDER_CANCEL_MESSAGE";
      chatMessageRequest.systemMessage = systemMessage;
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();

      var itemData = [];
      var data = {};

      data.message = setMessage(roomDataList.message, "en");
      data.systemMessage = setSystemMessage(systemMessage, "en");
      data.message_arabic = setMessage(roomDataList.message, "ar");
      data.systemMessage_arabic = setSystemMessage(systemMessage, "ar");

      data._id = roomDataList._id;
      data.seller_status = roomDataList.seller_status;
      data.buyer_status = roomDataList.buyer_status;
      data.item = roomDataList.item;
      data.type = roomDataList.type;
      data.isCard = roomDataList.isCard;
      data.offerCancel = roomDataList.offerCancel;
      data.sender = roomDataList.sender;
      data.receiver = roomDataList.receiver;
      data.offerCancel = roomDataList.offerCancel;
      data.date = date(roomDataList.created_at);
      data.time = time(roomDataList.created_at);
      itemData.push(data);
      io.sockets.in(room).emit("messageDetails", itemData);

      const roomData = await ChatMessage.find({
        room: roomDetails._id,
        seller_status: { $ne: "CANCELED" },
      });

      var offerData = await Offer.findOne({ room: room });
      var meetUpPop = false;
      if (offerData) {
        if (offerData.meetUp && !offerData.paymentType) {
          meetUpPop = true;
        }
      }

      await Order.updateOne({ _id: orderData._id }, { status: "CANCELED" });

      await Promise.map(roomData, async (item) => {
        var obj = {};
        obj._id = item._id;
        obj.message = setMessage(item.message, "en");
        obj.systemMessage = setSystemMessage(item.systemMessage, "en");
        obj.message_arabic = setMessage(item.message, "ar");
        obj.systemMessage_arabic = setSystemMessage(item.systemMessage, "ar");
        obj.seller_status = item.seller_status;
        obj.buyer_status = item.buyer_status;
        obj.item = item.item;
        obj.type = item.type;
        obj.meetUpPop = meetUpPop;
        obj.isCard = item.isCard;
        obj.offerCancel = item.offerCancel;
        obj.item.paymentType = roomData.paymentType;
        obj.sender = item.sender;
        obj.receiver = item.receiver;
        obj.date = date(item.created_at);
        obj.time = time(item.created_at);
        itemData.push(obj);
      });
      io.sockets.in(room).emit("chat-details", itemData);

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("ORDER_CANCEL_REQUEST", language),
      });
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
  /**
   * socket.emit('offer-canceled',"61cd8f7be37e711f60444ec6",{"user_id":"61c1ae2f57ae2226b42892b9","chat_message_id":"61cdb6ad2a823128ec2f9faa","language":"en"});
   * @param {*} room
   * @param {*} io
   * @param {*} data
   * @param {*} socket
   */
  offerCanceled: async (room, io, data, socket) => {
    var userSocketId = data.user_id;
    var roomSocketId = room;
    socket.join(userSocketId);
    try {
      const { language, chat_message_id } = data;
      var requestData = data;
      const roomDetails = await ChatRoom.findOne({ _id: roomSocketId });
      await updateOfferListing(socket, io, roomDetails.seller_id);

      // if (roomDetails.user_id.toString() === requestData.user_id) {
      //   var lastMessageSeller = "OFFER_RECEIVED";
      //   var lastMessage = "OFFER_SEND";
      //   await updateOfferListing(socket, io, roomDetails.seller_id);
      // }
      // if (roomDetails.seller_id.toString() === requestData.user_id) {
      //   var lastMessage = "OFFER_RECEIVED";
      //   var lastMessageSeller = "OFFER_SEND";
      //   await updateOfferListing(socket, io, roomDetails.user_id);
      // }

      if (!roomDetails) {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("ROOM_DATA_NOT", language),
        });
        return false;
      }
      const post = await Post.findOne({ _id: roomDetails.post_id });
      var roomData = roomDetails;
      const messageDetails = await ChatMessage.findOne({
        _id: chat_message_id,
      });
      if (!messageDetails) {
        io.sockets.in(userSocketId).emit("error", {
          message: "Message Data not found.",
        });
        return false;
      }
      if (messageDetails.buyer_status === "CANCELED") {
        io.sockets.in(userSocketId).emit("error", {
          message: setMessage("OFFER_CANCELED", language),
        });
        return false;
      }
      await ChatMessage.updateOne(
        { _id: chat_message_id },
        { offerCancel: true }
      );
      await Offer.updateOne(
        { room: roomDetails._id },
        { expired: true, status: "CANCELED" }
      );
      await ChatRoom.updateOne(
        { _id: roomDetails._id },
        { expired: true, orderCancelButton: false }
      );
      await walletService.unBlockAmountRecord({
        user_id: requestData.user_id,
        post_id: post._id,
      });

      io.sockets.in(userSocketId).emit("successfully", {
        message: setMessage("OFFER_CANCEL", language),
      });

      /**
       * Send offer notification
       */
      if (roomDetails.user_id.toString() === requestData.user_id) {
        var sellerNotification = await User.findOne({
          _id: roomDetails.seller_id,
        });
      }
      if (roomDetails.seller_id.toString() === requestData.user_id) {
        var sellerNotification = await User.findOne({
          _id: roomDetails.user_id,
        });
      }

      var title = setMessage("MESSAGE_TITLE", sellerNotification.language);
      var request = {};
      request.user = sellerNotification;
      request.message = "";
      request.title = title;
      request.type = "CHAT";
      request.roomId = roomDetails._id;
      request.isMail = true;
      request.orderId = "";

      var t = i18next.t;
      i18next.changeLanguage(sellerNotification.language);
      var itemPrice = roomDetails.item.title;
      var itemName = roomDetails.item.price;
      request.message = t("OFFER_EXPIRED_CANCELLED", { itemPrice, itemName });
      sendNotification(request);

      /**
       * Create expired card
       */

      var lastMessageSeller = "Offer Canceled";
      var lastMessage = "Offer Canceled";
      await updateMessageCard(
        socket,
        io,
        roomDetails,
        data,
        lastMessageSeller,
        lastMessage
      );

      /**
       * Update offer
       */
      await ChatMessage.updateMany(
        { room: roomData._id, itemData: true },
        { seller_status: "CANCELED", buyer_status: "CANCELED" }
      );

      /**
       * Create chat history Expired
       */
      var chatMessageRequest = new ChatMessage();
      chatMessageRequest.isCard = true;
      if (roomData.user_id.toString() === requestData.user_id) {
        chatMessageRequest.sender = requestData.user_id;
        chatMessageRequest.receiver = roomData.seller_id;
      }
      if (roomData.seller_id.toString() === requestData.user_id) {
        chatMessageRequest.sender = requestData.user_id;
        chatMessageRequest.receiver = roomData.user_id;
      }
      chatMessageRequest.room = roomData._id;
      chatMessageRequest.item = roomDetails.item;
      chatMessageRequest.itemData = false;
      chatMessageRequest.status = false;
      chatMessageRequest.expired = true;
      chatMessageRequest.type = "BOTH";
      chatMessageRequest.seller_status = "EXPIRED";
      chatMessageRequest.buyer_status = "EXPIRED";
      chatMessageRequest.lastDate = moment().toISOString();
      var lastMessage = await chatMessageRequest.save();

      /**
       * Send room Details
       */
      var roomDetailsData = await ChatRoom.findOne({ _id: roomData._id });
      if (roomDetailsData) {
        var offerCount = await Offer.countDocuments({
          room: room,
          expired: false,
        });
        const seller = await User.findOne(
          { _id: roomDetailsData.seller_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        const buyer = await User.findOne(
          { _id: roomDetailsData.user_id },
          {
            first_name: 1,
            last_name: 1,
            image: 1,
            rating: 1,
            totalRating: 1,
          }
        );
        if (offerCount == 0) {
          roomDetailsData.item.meetUp = roomData.item.meetUp ? true : false;
          roomDetailsData.item.shipping = post.shipping;
        } else {
          roomDetailsData.item.meetUp = roomData.item.meetUp ? true : false;
          roomDetailsData.item.shipping = roomData.shipping;
        }
        const postData = await Post.findOne({ _id: roomDetailsData.post_id });
        var dataRequest = {
          room: room,
          seller: seller,
          orderCancelButton: roomDetailsData.orderCancelButton,
          order_id: roomDetailsData.order_id,
          buyer: buyer,
          buyNow: postData.buyNow,
          item: roomDetailsData.item,
          offerCount: roomDetailsData.buyNow ? 1 : offerCount,
        };

        io.sockets.in(roomSocketId).emit("room-details", dataRequest);
      }

      const roomDataArray = await ChatMessage.find({
        room: roomData._id,
        seller_status: { $ne: "CANCELED" },
      });

      var offerData = await Offer.findOne({ room: room });
      var meetUpPop = false;
      if (offerData) {
        if (offerData.meetUp && !offerData.paymentType) {
          meetUpPop = true;
        }
      }

      var data = [];
      await Promise.map(roomDataArray, async (item) => {
        var obj = {};
        obj._id = item._id;
        obj.message = setMessage(item.message, "en");
        obj.systemMessage = setSystemMessage(item.systemMessage, "en");
        obj.message_arabic = setMessage(item.message, "ar");
        obj.systemMessage_arabic = setSystemMessage(item.systemMessage, "ar");
        obj.seller_status = item.seller_status;
        obj.buyer_status = item.buyer_status;
        obj.item = item.item;
        obj.type = item.type;
        obj.meetUpPop = meetUpPop;
        obj.isCard = item.isCard;
        obj.offerCancel = item.offerCancel;
        obj.item.paymentType = roomData.paymentType;
        obj.sender = item.sender;
        obj.receiver = item.receiver;
        obj.date = date(item.created_at);
        obj.time = time(item.created_at);
        data.push(obj);
      });
      io.sockets.in(roomSocketId).emit("chat-details", data);
    } catch (err) {
      console.log("err ==>", err);
      io.sockets.in(userSocketId).emit("error", { message: err });
      return false;
    }
  },
};
async function updateMessage(socket, io, roomData, data) {
  try {
    var userId = data.user_id;
    if (roomData.user_id.toString() === data.user_id) {
      var chatUser = await User.findOne({ _id: roomData.seller_id });
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.sellerNotificationCount =
        roomData.sellerNotificationCount + 1;
      updateRequest.lastDate = moment().toISOString();
      updateRequest.lastMessage = ucFirst(data.message);
      updateRequest.lastMessageSeller = ucFirst(data.message);
      await ChatRoom.updateOne({ _id: roomData._id }, updateRequest);
      if (!chatUser.online) {
        var chatList = await ChatRoom.find({ seller_id: chatUser._id }).sort({
          updated_at: -1,
        });

        var messageData = [];
        await Promise.map(chatList, async (item) => {
          var obj = {};
          var userData = await User.findOne(
            { _id: item.user_id },
            { first_name: 1, last_name: 1, image: 1 }
          );
          if (userData) {
            obj.name = `${ucFirst(userData.first_name)} ${ucFirst(
              userData.last_name
            )}`;
            obj.image = userData.image;
            obj.message = ucFirst(item.lastMessageSeller);
            obj.notificationCount = item.sellerNotificationCount;
            obj.room = item._id;
            obj.itemImage = item.item.image;
            obj.time = item.time;
            messageData.push(obj);
          }
        });

        /**
         * Send notification
         */
        if (chatUser.notification) {
          var message = `${setMessage("NEW_MESSAGE", chatUser.language)}`;
          var title = setMessage("MESSAGE_TITLE", chatUser.language);
          var request = {};
          request.user = chatUser;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          await sendPushNotification(request);
        }
      }
    }
    if (roomData.seller_id.toString() === data.user_id) {
      var chatUser = await User.findOne({ _id: roomData.user_id });
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.buyerNotificationCount =
        roomData.buyerNotificationCount + 1;
      updateRequest.lastDate = moment().toISOString();
      updateRequest.lastMessage = ucFirst(data.message);
      updateRequest.lastMessageSeller = ucFirst(data.message);
      await ChatRoom.updateOne({ _id: roomData._id }, updateRequest);
      if (!chatUser.online) {
        var chatList = await ChatRoom.find({ seller_id: chatUser._id }).sort({
          updated_at: -1,
        });

        var messageData = [];
        await Promise.map(chatList, async (item) => {
          var obj = {};
          var userData = await User.findOne(
            { _id: item.user_id },
            { first_name: 1, last_name: 1, image: 1 }
          );
          if (userData) {
            obj.name = `${ucFirst(userData.first_name)} ${ucFirst(
              userData.last_name
            )}`;
            obj.image = userData.image;
            obj.message = ucFirst(item.lastMessage);
            obj.notificationCount = item.buyerNotificationCount;
            obj.room = item._id;
            obj.itemImage = item.item.image;
            obj.time = item.time;
            messageData.push(obj);
          }
        });

        /**
         * Send notification
         */
        if (chatUser.notification) {
          var message = `${setMessage("NEW_MESSAGE", chatUser.language)}`;
          var title = setMessage("MESSAGE_TITLE", chatUser.language);
          var request = {};
          request.user = chatUser;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          await sendPushNotification(request);
        }
      }
    }
    socket.broadcast.emit("buyerChatListUpdate");
  } catch (err) {
    console.log("err ==>", err);
    io.sockets.in(userId).emit("error", { message: err });
    return false;
  }
}
async function updateMessageCard(
  socket,
  io,
  roomData,
  data,
  lastMessageSeller,
  lastMessage
) {
  try {
    var userId = data.user_id;
    if (roomData.user_id.toString() === data.user_id) {
      var chatUser = await User.findOne({ _id: roomData.seller_id });
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.sellerNotificationCount =
        roomData.sellerNotificationCount + 1;
      updateRequest.lastDate = moment().toISOString();
      updateRequest.lastMessage = lastMessage;
      updateRequest.lastMessageSeller = lastMessageSeller;
      await ChatRoom.updateOne({ _id: roomData._id }, updateRequest);

      if (!chatUser.online) {
        /**
         * Send notification
         */
        if (chatUser.notification) {
          var message = `${setMessage("NEW_MESSAGE", chatUser.language)}`;
          var title = setMessage("MESSAGE_TITLE", chatUser.language);
          var request = {};
          request.user = chatUser;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          await sendPushNotification(request);
        }
      }
    }
    if (roomData.seller_id.toString() === data.user_id) {
      var chatUser = await User.findOne({ _id: roomData.user_id });
      var updateRequest = {};
      updateRequest.time = currentTime();
      updateRequest.buyerNotificationCount =
        roomData.buyerNotificationCount + 1;
      updateRequest.lastDate = moment().toISOString();
      updateRequest.lastMessage = lastMessage;
      updateRequest.lastMessageSeller = lastMessageSeller;
      await ChatRoom.updateOne({ _id: roomData._id }, updateRequest);
      if (!chatUser.online) {
        /**
         * Send notification
         */
        if (chatUser.notification) {
          var message = `${setMessage("NEW_MESSAGE", chatUser.language)}`;
          var title = setMessage("MESSAGE_TITLE", chatUser.language);
          var request = {};
          request.user = chatUser;
          request.message = message;
          request.title = title;
          request.type = "CHAT";
          request.roomId = roomData._id;
          request.orderId = "";
          await sendPushNotification(request);
        }
      }
    }
    socket.broadcast.emit("buyerChatListUpdate");
  } catch (err) {
    console.log("err ==>", err);
    io.sockets.in(userId).emit("error", { message: err });
    return false;
  }
}
async function updateOfferListing(socket, io, userId) {
  try {
    socket.broadcast.emit("offer-listing-update", { message: "test" });
  } catch (err) {
    console.log("socket err ==>", err);
    io.sockets.in(userId).emit("error", { message: err });
    return false;
  }
}
