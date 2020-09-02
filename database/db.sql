CREATE TABLE `orders_product` (
  `order_id` varchar(36) NOT NULL DEFAULT '',
  `product_id` varchar(36) NOT NULL DEFAULT '',
  `qty` decimal(10,1) DEFAULT NULL,
  `created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `orders` (
  `order_id` varchar(36) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `order_status` varchar(64) NOT NULL DEFAULT 'new',
  `created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `created` (`created`),
  KEY `status` (`order_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `products` (
  `product_id` varchar(36) NOT NULL DEFAULT '',
  `name` varchar(255) NOT NULL DEFAULT '',
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `qty` decimal(10,1) NOT NULL,
  `created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `shipment_product` (
  `shipment_id` varchar(36) NOT NULL DEFAULT '',
  `product_id` varchar(36) NOT NULL DEFAULT '',
  `qty` decimal(10,1) NOT NULL,
  `created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;