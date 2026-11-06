--
-- PostgreSQL database dump
--

\restrict nFKbJ9OLainmE7Ab3Vj0Ip9DvTK1XuT0gkxeqsT7s37CB1TNggjH3t5vZ2XfFyf

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart (
    id integer NOT NULL,
    cart_id character varying(150) NOT NULL,
    cart_total numeric(10,2) DEFAULT 0 NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    discount_type character varying(10),
    discount numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: cart_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_id_seq OWNED BY public.cart.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    subitems text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    order_id integer NOT NULL,
    customer_name character varying(150),
    customer_mobile bigint,
    customer_email character varying(150),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_mobile_valid CHECK (((customer_mobile IS NULL) OR ((customer_mobile >= 1000000000) AND (customer_mobile <= '9999999999'::bigint))))
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: order_item_subitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_item_subitems (
    id integer NOT NULL,
    order_item_id integer NOT NULL,
    subitem_id integer,
    group_name character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: order_item_subitems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_item_subitems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_item_subitems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_item_subitems_id_seq OWNED BY public.order_item_subitems.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer,
    name character varying(150) NOT NULL,
    price numeric(10,2) NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    amount numeric(10,2) NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    discount_type character varying(10),
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    final_total numeric(10,2)
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id integer NOT NULL,
    order_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    cash numeric(10,2) DEFAULT 0 NOT NULL,
    online numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- Name: product_subitem_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_subitem_groups (
    product_id integer NOT NULL,
    group_name character varying(50) NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    category_id integer,
    name character varying(150) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    image character varying(255),
    is_active smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: subitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subitems (
    id integer NOT NULL,
    group_name character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    is_active smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subitems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subitems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subitems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subitems_id_seq OWNED BY public.subitems.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: cart id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart ALTER COLUMN id SET DEFAULT nextval('public.cart_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: order_item_subitems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_subitems ALTER COLUMN id SET DEFAULT nextval('public.order_item_subitems_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: subitems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subitems ALTER COLUMN id SET DEFAULT nextval('public.subitems_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cart; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart (id, cart_id, cart_total, item_count, created_at, discount_type, discount) FROM stdin;
2731	cart_y3np0ts	0.00	0	2026-10-30 08:35:17.904163+00	\N	0.00
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, cart_id, product_id, price, qty, subitems, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, created_at) FROM stdin;
3	Beverages	2026-08-30 03:42:26+00
5	Burger	2026-10-17 09:41:29+00
9	Coffee	2026-10-17 09:42:02+00
10	Desserts	2026-10-17 09:42:09+00
13	Kids Menu	2026-10-17 09:42:42+00
14	Loaded Fries	2026-10-17 09:42:49+00
19	Sandwiches	2026-10-25 10:01:05+00
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, order_id, customer_name, customer_mobile, customer_email, created_at) FROM stdin;
1	1	\N	\N	\N	2026-10-26 12:08:55.186617+00
2	2	\N	\N	\N	2026-10-26 12:34:21.866171+00
3	4	\N	\N	\N	2026-10-26 12:46:41.044358+00
4	5	\N	\N	\N	2026-10-26 13:23:26.119638+00
5	6	\N	\N	\N	2026-10-26 13:43:04.049301+00
6	7	\N	\N	\N	2026-10-26 13:55:56.039121+00
7	8	\N	\N	\N	2026-10-26 13:56:17.842464+00
8	9	\N	\N	\N	2026-10-26 14:13:43.843922+00
9	10	\N	\N	\N	2026-10-26 14:18:38.875052+00
10	11	\N	\N	\N	2026-10-26 14:34:34.985086+00
11	12	\N	\N	\N	2026-10-26 14:50:41.571053+00
12	14	\N	\N	\N	2026-10-26 15:08:56.613464+00
13	15	\N	\N	\N	2026-10-26 15:13:31.26398+00
14	16	\N	\N	\N	2026-10-26 15:14:08.872634+00
15	17	\N	\N	\N	2026-10-26 15:28:18.800126+00
16	18	\N	\N	\N	2026-10-26 15:35:46.565079+00
17	19	\N	\N	\N	2026-10-26 16:10:10.660169+00
18	20	\N	\N	\N	2026-10-26 17:20:26.026481+00
19	21	\N	\N	\N	2026-10-26 17:20:53.314863+00
20	22	\N	\N	\N	2026-10-27 10:35:34.375345+00
21	23	\N	\N	\N	2026-10-27 10:37:41.470179+00
22	24	\N	\N	\N	2026-10-27 13:25:07.099223+00
23	25	\N	\N	\N	2026-10-27 13:53:17.628086+00
24	26	\N	\N	\N	2026-10-27 14:36:09.796745+00
25	27	\N	\N	\N	2026-10-27 14:58:41.427787+00
26	28	\N	\N	\N	2026-10-27 15:01:55.008342+00
27	29	\N	\N	\N	2026-10-27 15:21:54.187731+00
28	30	\N	\N	\N	2026-10-27 16:15:23.679613+00
29	31	\N	\N	\N	2026-10-27 16:16:09.208112+00
30	32	\N	\N	\N	2026-10-27 17:30:13.631805+00
31	33	\N	\N	\N	2026-10-28 07:37:50.273071+00
32	34	\N	\N	\N	2026-10-28 10:38:00.229941+00
33	35	\N	\N	\N	2026-10-28 12:47:11.213807+00
34	36	\N	\N	\N	2026-10-28 12:47:20.323583+00
35	37	\N	\N	\N	2026-10-28 14:04:05.182228+00
36	38	\N	\N	\N	2026-10-28 14:17:50.972866+00
37	39	\N	\N	\N	2026-10-28 14:33:24.373121+00
38	40	\N	\N	\N	2026-10-28 14:40:11.429113+00
39	41	\N	\N	\N	2026-10-28 15:10:28.409032+00
40	42	\N	\N	\N	2026-10-28 15:17:09.113377+00
41	43	\N	\N	\N	2026-10-28 15:57:55.496705+00
42	44	\N	\N	\N	2026-10-28 16:46:34.726551+00
43	45	\N	\N	\N	2026-10-28 17:03:42.337592+00
44	46	\N	\N	\N	2026-10-28 17:29:44.972668+00
45	47	\N	\N	\N	2026-10-28 17:48:50.064834+00
46	48	\N	\N	\N	2026-10-29 08:27:13.040235+00
47	49	\N	\N	\N	2026-10-29 12:46:55.798165+00
48	50	\N	\N	\N	2026-10-29 12:47:41.568417+00
49	51	\N	\N	\N	2026-10-29 13:04:30.961443+00
50	53	\N	\N	\N	2026-10-29 13:35:47.601+00
51	54	\N	\N	\N	2026-10-29 14:00:55.948479+00
52	55	\N	\N	\N	2026-10-29 16:55:59.703214+00
53	57	\N	\N	\N	2026-10-30 05:52:32.064636+00
\.


--
-- Data for Name: order_item_subitems; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_item_subitems (id, order_item_id, subitem_id, group_name, name, price) FROM stdin;
1	2	1	Choice of Bread	Focaccia	0.00
2	2	5	Choice of Bread	Tosted	0.00
3	2	11	Choice of Protein	Grilled Panner	219.00
4	2	18	Choice of Sauce	Pickle Mayo	0.00
5	2	20	Extra Toppings	Cheese 2 Slice	40.00
6	3	1	Choice of Bread	Focaccia	0.00
7	3	5	Choice of Bread	Tosted	0.00
8	3	11	Choice of Protein	Grilled Panner	219.00
9	3	18	Choice of Sauce	Pickle Mayo	0.00
10	3	20	Extra Toppings	Cheese 2 Slice	40.00
11	4	1	Choice of Bread	Focaccia	0.00
12	4	11	Choice of Protein	Grilled Panner	219.00
13	4	17	Choice of Sauce	Garlic Aioli	0.00
14	8	1	Choice of Bread	Focaccia	0.00
15	8	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
16	8	17	Choice of Sauce	Garlic Aioli	0.00
17	9	4	Choice of Bread	Sourdough	0.00
18	9	14	Choice of Protein	Tangy Mustard Chicken	229.00
19	9	18	Choice of Sauce	Pickle Mayo	0.00
20	10	1	Choice of Bread	Focaccia	0.00
21	10	11	Choice of Protein	Grilled Panner	219.00
22	10	17	Choice of Sauce	Garlic Aioli	0.00
23	15	3	Choice of Bread	Multigrain	0.00
24	15	5	Choice of Bread	Tosted	0.00
25	15	12	Choice of Protein	Mayo Chicken	229.00
26	15	16	Choice of Sauce	Cilantro Pesto	0.00
27	18	5	Choice of Bread	Tosted	0.00
28	18	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
29	18	15	Choice of Sauce	Burger Mayo	0.00
30	24	1	Choice of Bread	Focaccia	0.00
31	24	13	Choice of Protein	Rosted Exotic Vegetable	219.00
32	24	17	Choice of Sauce	Garlic Aioli	0.00
33	26	1	Choice of Bread	Focaccia	0.00
34	26	4	Choice of Bread	Sourdough	0.00
35	26	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
36	26	18	Choice of Sauce	Pickle Mayo	0.00
37	30	4	Choice of Bread	Sourdough	0.00
38	30	13	Choice of Protein	Rosted Exotic Vegetable	219.00
39	30	17	Choice of Sauce	Garlic Aioli	0.00
40	31	1	Choice of Bread	Focaccia	0.00
41	31	11	Choice of Protein	Grilled Panner	219.00
42	31	18	Choice of Sauce	Pickle Mayo	0.00
43	34	3	Choice of Bread	Multigrain	0.00
44	34	8	Choice of Protein	Cheesy Avocado	219.00
45	34	18	Choice of Sauce	Pickle Mayo	0.00
46	36	1	Choice of Bread	Focaccia	0.00
47	36	4	Choice of Bread	Sourdough	0.00
48	36	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
49	36	18	Choice of Sauce	Pickle Mayo	0.00
50	37	1	Choice of Bread	Focaccia	0.00
51	37	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
52	37	17	Choice of Sauce	Garlic Aioli	0.00
53	38	4	Choice of Bread	Sourdough	0.00
54	38	14	Choice of Protein	Tangy Mustard Chicken	229.00
55	38	16	Choice of Sauce	Cilantro Pesto	0.00
56	39	1	Choice of Bread	Focaccia	0.00
57	39	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
58	39	14	Choice of Protein	Tangy Mustard Chicken	229.00
59	40	6	Choice of Bread	White Panini	0.00
60	40	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
61	40	16	Choice of Sauce	Cilantro Pesto	0.00
62	41	4	Choice of Bread	Sourdough	0.00
63	41	5	Choice of Bread	Tosted	0.00
64	41	14	Choice of Protein	Tangy Mustard Chicken	229.00
65	41	17	Choice of Sauce	Garlic Aioli	0.00
66	42	1	Choice of Bread	Focaccia	0.00
67	42	5	Choice of Bread	Tosted	0.00
68	42	12	Choice of Protein	Mayo Chicken	229.00
69	42	16	Choice of Sauce	Cilantro Pesto	0.00
70	43	1	Choice of Bread	Focaccia	0.00
71	43	8	Choice of Protein	Cheesy Avocado	219.00
72	43	15	Choice of Sauce	Burger Mayo	0.00
73	45	3	Choice of Bread	Multigrain	0.00
74	45	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
75	45	18	Choice of Sauce	Pickle Mayo	0.00
76	47	3	Choice of Bread	Multigrain	0.00
77	47	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
78	47	18	Choice of Sauce	Pickle Mayo	0.00
79	48	3	Choice of Bread	Multigrain	0.00
80	48	5	Choice of Bread	Tosted	0.00
81	48	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
82	48	19	Choice of Sauce	Spicy Chipotle	0.00
83	51	3	Choice of Bread	Multigrain	0.00
84	51	11	Choice of Protein	Grilled Panner	219.00
85	51	18	Choice of Sauce	Pickle Mayo	0.00
86	52	3	Choice of Bread	Multigrain	0.00
87	52	10	Choice of Protein	Gochujang Tofu	219.00
88	52	17	Choice of Sauce	Garlic Aioli	0.00
89	53	4	Choice of Bread	Sourdough	0.00
90	53	13	Choice of Protein	Rosted Exotic Vegetable	219.00
91	53	16	Choice of Sauce	Cilantro Pesto	0.00
92	54	1	Choice of Bread	Focaccia	0.00
93	54	5	Choice of Bread	Tosted	0.00
94	54	8	Choice of Protein	Cheesy Avocado	219.00
95	54	16	Choice of Sauce	Cilantro Pesto	0.00
96	55	1	Choice of Bread	Focaccia	0.00
97	55	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
98	55	18	Choice of Sauce	Pickle Mayo	0.00
99	56	2	Choice of Bread	Grilled	0.00
100	56	4	Choice of Bread	Sourdough	0.00
101	56	11	Choice of Protein	Grilled Panner	219.00
102	56	17	Choice of Sauce	Garlic Aioli	0.00
103	58	1	Choice of Bread	Focaccia	0.00
104	58	13	Choice of Protein	Rosted Exotic Vegetable	219.00
105	58	16	Choice of Sauce	Cilantro Pesto	0.00
106	59	3	Choice of Bread	Multigrain	0.00
107	59	11	Choice of Protein	Grilled Panner	219.00
108	59	18	Choice of Sauce	Pickle Mayo	0.00
109	61	5	Choice of Bread	Tosted	0.00
110	61	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
111	62	1	Choice of Bread	Focaccia	0.00
112	62	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
113	62	18	Choice of Sauce	Pickle Mayo	0.00
114	63	4	Choice of Bread	Sourdough	0.00
115	63	9	Choice of Protein	Chicken Salami	229.00
116	63	17	Choice of Sauce	Garlic Aioli	0.00
117	64	1	Choice of Bread	Focaccia	0.00
118	64	11	Choice of Protein	Grilled Panner	219.00
119	64	16	Choice of Sauce	Cilantro Pesto	0.00
120	65	6	Choice of Bread	White Panini	0.00
121	65	8	Choice of Protein	Cheesy Avocado	219.00
122	65	17	Choice of Sauce	Garlic Aioli	0.00
123	68	1	Choice of Bread	Focaccia	0.00
124	68	14	Choice of Protein	Tangy Mustard Chicken	229.00
125	68	18	Choice of Sauce	Pickle Mayo	0.00
126	70	1	Choice of Bread	Focaccia	0.00
127	70	14	Choice of Protein	Tangy Mustard Chicken	229.00
128	70	18	Choice of Sauce	Pickle Mayo	0.00
129	71	5	Choice of Bread	Tosted	0.00
130	71	6	Choice of Bread	White Panini	0.00
131	71	14	Choice of Protein	Tangy Mustard Chicken	229.00
132	71	17	Choice of Sauce	Garlic Aioli	0.00
133	74	3	Choice of Bread	Multigrain	0.00
134	74	13	Choice of Protein	Rosted Exotic Vegetable	219.00
135	74	16	Choice of Sauce	Cilantro Pesto	0.00
136	75	4	Choice of Bread	Sourdough	0.00
137	75	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
138	75	17	Choice of Sauce	Garlic Aioli	0.00
139	76	1	Choice of Bread	Focaccia	0.00
140	76	14	Choice of Protein	Tangy Mustard Chicken	229.00
141	76	16	Choice of Sauce	Cilantro Pesto	0.00
142	76	20	Extra Toppings	Cheese 2 Slice	40.00
143	81	3	Choice of Bread	Multigrain	0.00
144	81	14	Choice of Protein	Tangy Mustard Chicken	229.00
145	81	18	Choice of Sauce	Pickle Mayo	0.00
146	82	5	Choice of Bread	Tosted	0.00
147	82	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
148	82	17	Choice of Sauce	Garlic Aioli	0.00
149	83	2	Choice of Bread	Grilled	0.00
150	83	14	Choice of Protein	Tangy Mustard Chicken	229.00
151	83	17	Choice of Sauce	Garlic Aioli	0.00
152	84	6	Choice of Bread	White Panini	0.00
153	84	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
154	84	19	Choice of Sauce	Spicy Chipotle	0.00
155	89	4	Choice of Bread	Sourdough	0.00
156	89	11	Choice of Protein	Grilled Panner	219.00
157	89	17	Choice of Sauce	Garlic Aioli	0.00
158	91	3	Choice of Bread	Multigrain	0.00
159	91	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
160	91	15	Choice of Sauce	Burger Mayo	0.00
161	92	1	Choice of Bread	Focaccia	0.00
162	92	8	Choice of Protein	Cheesy Avocado	219.00
163	92	18	Choice of Sauce	Pickle Mayo	0.00
164	93	5	Choice of Bread	Tosted	0.00
165	93	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
166	93	17	Choice of Sauce	Garlic Aioli	0.00
167	94	3	Choice of Bread	Multigrain	0.00
168	94	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
169	94	15	Choice of Sauce	Burger Mayo	0.00
170	95	1	Choice of Bread	Focaccia	0.00
171	95	14	Choice of Protein	Tangy Mustard Chicken	229.00
172	95	17	Choice of Sauce	Garlic Aioli	0.00
173	97	1	Choice of Bread	Focaccia	0.00
174	97	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
175	97	15	Choice of Sauce	Burger Mayo	0.00
176	100	6	Choice of Bread	White Panini	0.00
177	100	12	Choice of Protein	Mayo Chicken	229.00
178	100	16	Choice of Sauce	Cilantro Pesto	0.00
179	108	5	Choice of Bread	Tosted	0.00
180	108	7	Choice of Protein	Black Pepper Roasted Chicken	229.00
181	108	17	Choice of Sauce	Garlic Aioli	0.00
182	109	3	Choice of Bread	Multigrain	0.00
183	109	14	Choice of Protein	Tangy Mustard Chicken	229.00
184	109	18	Choice of Sauce	Pickle Mayo	0.00
185	110	1	Choice of Bread	Focaccia	0.00
186	110	13	Choice of Protein	Rosted Exotic Vegetable	219.00
187	110	16	Choice of Sauce	Cilantro Pesto	0.00
188	111	1	Choice of Bread	Focaccia	0.00
189	111	13	Choice of Protein	Rosted Exotic Vegetable	219.00
190	111	16	Choice of Sauce	Cilantro Pesto	0.00
191	112	1	Choice of Bread	Focaccia	0.00
192	112	11	Choice of Protein	Grilled Panner	219.00
193	112	16	Choice of Sauce	Cilantro Pesto	0.00
194	115	1	Choice of Bread	Focaccia	0.00
195	115	13	Choice of Protein	Rosted Exotic Vegetable	219.00
196	115	16	Choice of Sauce	Cilantro Pesto	0.00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, name, price, qty, amount) FROM stdin;
1	1	9	Americano Hot	79.00	3	237.00
2	2	63	Sandwich	0.00	1	259.00
3	3	63	Sandwich	0.00	1	259.00
4	4	63	Sandwich	0.00	1	219.00
5	4	45	Spicy Veg Burger	219.00	1	219.00
6	5	17	Chicken Loaded Fries	229.00	2	458.00
7	5	43	Spicy Chicken Burger	229.00	2	458.00
8	5	63	Sandwich	0.00	2	458.00
9	5	63	Sandwich	0.00	1	229.00
10	5	63	Sandwich	0.00	3	657.00
11	6	43	Spicy Chicken Burger	229.00	1	229.00
12	7	38	Peri Peri Fries	99.00	2	198.00
13	7	40	Plain Fries	89.00	1	89.00
14	7	10	Americano Iced	89.00	1	89.00
15	8	63	Sandwich	0.00	1	229.00
16	8	17	Chicken Loaded Fries	229.00	1	229.00
17	9	43	Spicy Chicken Burger	229.00	1	229.00
18	9	63	Sandwich	0.00	2	458.00
19	10	43	Spicy Chicken Burger	229.00	1	229.00
20	10	45	Spicy Veg Burger	219.00	1	219.00
21	11	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
22	11	43	Spicy Chicken Burger	229.00	1	229.00
23	12	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
24	12	63	Sandwich	0.00	1	219.00
25	13	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
26	13	63	Sandwich	0.00	1	229.00
27	14	43	Spicy Chicken Burger	229.00	1	229.00
28	14	38	Peri Peri Fries	99.00	1	99.00
29	14	45	Spicy Veg Burger	219.00	1	219.00
30	15	63	Sandwich	0.00	1	219.00
31	16	63	Sandwich	0.00	1	219.00
32	16	45	Spicy Veg Burger	219.00	1	219.00
33	17	43	Spicy Chicken Burger	229.00	1	229.00
34	17	63	Sandwich	0.00	1	219.00
35	18	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
36	18	63	Sandwich	0.00	1	229.00
37	19	63	Sandwich	0.00	1	229.00
38	19	63	Sandwich	0.00	1	229.00
39	19	63	Sandwich	0.00	1	458.00
40	20	63	Sandwich	0.00	1	229.00
41	20	63	Sandwich	0.00	1	229.00
42	20	63	Sandwich	0.00	1	229.00
43	21	63	Sandwich	0.00	2	438.00
44	22	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
45	22	63	Sandwich	0.00	1	229.00
46	23	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
47	23	63	Sandwich	0.00	1	229.00
48	24	63	Sandwich	0.00	1	229.00
49	24	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
50	24	43	Spicy Chicken Burger	229.00	1	229.00
51	24	63	Sandwich	0.00	1	219.00
52	25	63	Sandwich	0.00	4	876.00
53	26	63	Sandwich	0.00	1	219.00
54	27	63	Sandwich	0.00	1	219.00
55	28	63	Sandwich	0.00	1	229.00
56	29	63	Sandwich	0.00	1	219.00
57	29	49	Veg Loaded Frice	219.00	1	219.00
58	30	63	Sandwich	0.00	1	219.00
59	31	63	Sandwich	0.00	1	219.00
60	32	43	Spicy Chicken Burger	229.00	1	229.00
61	32	63	Sandwich	0.00	1	229.00
62	33	63	Sandwich	0.00	1	229.00
63	34	63	Sandwich	0.00	1	229.00
64	34	63	Sandwich	0.00	1	219.00
65	34	63	Sandwich	0.00	1	219.00
66	34	17	Chicken Loaded Fries	229.00	1	229.00
67	35	43	Spicy Chicken Burger	229.00	2	458.00
68	35	63	Sandwich	0.00	1	229.00
69	36	43	Spicy Chicken Burger	229.00	2	458.00
70	36	63	Sandwich	0.00	1	229.00
71	37	63	Sandwich	0.00	1	229.00
72	37	9	Americano Hot	79.00	1	79.00
73	37	53	Coca-Cola Can	50.00	1	50.00
74	37	63	Sandwich	0.00	1	219.00
75	38	63	Sandwich	0.00	1	229.00
76	38	63	Sandwich	0.00	1	269.00
77	38	14	Cappuccino Iced	109.00	1	109.00
78	38	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
79	38	59	Coca-Cola 200ml	15.00	1	15.00
80	38	66	water 500 ml	10.00	1	10.00
81	38	63	Sandwich	0.00	1	229.00
82	39	63	Sandwich	0.00	1	229.00
83	39	63	Sandwich	0.00	1	229.00
84	39	63	Sandwich	0.00	1	229.00
85	39	14	Cappuccino Iced	109.00	1	109.00
86	39	66	water 500 ml	10.00	1	10.00
87	39	59	Coca-Cola 200ml	15.00	1	15.00
88	39	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
89	40	63	Sandwich	0.00	1	219.00
90	41	18	Chicken Nuggets 8 Pcs	99.00	3	297.00
91	41	63	Sandwich	0.00	5	1145.00
92	42	63	Sandwich	0.00	1	219.00
93	43	63	Sandwich	0.00	1	229.00
94	44	63	Sandwich	0.00	1	229.00
95	45	63	Sandwich	0.00	1	229.00
96	45	49	Veg Loaded Frice	219.00	1	219.00
97	45	63	Sandwich	0.00	1	229.00
98	46	43	Spicy Chicken Burger	229.00	2	458.00
99	46	38	Peri Peri Fries	99.00	1	99.00
100	46	63	Sandwich	0.00	1	229.00
101	46	66	water 500 ml	10.00	1	10.00
102	47	64	Non Veg Loaded Fries	229.00	1	229.00
103	47	38	Peri Peri Fries	99.00	1	99.00
104	47	18	Chicken Nuggets 8 Pcs	99.00	1	99.00
105	48	38	Peri Peri Fries	99.00	1	99.00
106	49	66	water 500 ml	10.00	1	10.00
107	50	26	Flat White Hot	99.00	1	99.00
108	51	63	Sandwich	0.00	1	229.00
109	51	63	Sandwich	0.00	1	229.00
110	52	63	Sandwich	0.00	1	219.00
111	53	63	Sandwich	0.00	1	219.00
112	54	63	Sandwich	0.00	1	219.00
113	54	24	Espresso Single Shot	49.00	1	49.00
114	55	45	Spicy Veg Burger	219.00	1	219.00
115	55	63	Sandwich	0.00	2	438.00
116	56	23	Espresso Double Shot	79.00	1	79.00
117	57	23	Espresso Double Shot	79.00	1	79.00
124	64	43	Spicy Chicken Burger	229.00	1	229.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, total, item_count, created_at, discount_type, discount, discount_amount, final_total) FROM stdin;
1	237.00	1	2026-10-26 12:08:47.885371+00	\N	0.00	0.00	237.00
2	259.00	1	2026-10-26 12:34:19.042765+00	percent	15.00	39.00	220.00
3	259.00	1	2026-10-26 12:36:11.890356+00	flat	15.00	15.00	244.00
4	438.00	2	2026-10-26 12:46:38.299832+00	percent	15.00	66.00	372.00
5	2260.00	5	2026-10-26 13:23:21.875361+00	percent	15.00	339.00	1921.00
6	229.00	1	2026-10-26 13:43:01.670261+00	flat	15.00	15.00	214.00
7	376.00	3	2026-10-26 13:55:53.934691+00	percent	15.00	56.00	320.00
8	458.00	2	2026-10-26 13:56:15.145704+00	percent	15.00	69.00	389.00
9	687.00	2	2026-10-26 14:13:41.515231+00	percent	15.00	103.00	584.00
10	448.00	2	2026-10-26 14:18:36.640187+00	percent	15.00	67.00	381.00
11	328.00	2	2026-10-26 14:34:31.077346+00	percent	15.00	49.00	279.00
12	318.00	2	2026-10-26 14:50:35.996244+00	percent	15.00	48.00	270.00
13	328.00	2	2026-10-26 15:05:40.192709+00	percent	15.00	49.00	279.00
14	547.00	3	2026-10-26 15:08:50.710176+00	percent	15.00	82.00	465.00
15	219.00	1	2026-10-26 15:13:28.10513+00	percent	15.00	33.00	186.00
16	438.00	2	2026-10-26 15:14:03.69376+00	percent	15.00	66.00	372.00
17	448.00	2	2026-10-26 15:28:13.839869+00	percent	15.00	67.00	381.00
18	328.00	2	2026-10-26 15:35:44.379947+00	percent	15.00	49.00	279.00
19	916.00	3	2026-10-26 16:10:03.265998+00	percent	15.00	137.00	779.00
20	687.00	3	2026-10-26 17:20:23.629967+00	percent	15.00	103.00	584.00
21	438.00	1	2026-10-26 17:20:50.705198+00	percent	15.00	66.00	372.00
22	328.00	2	2026-10-27 10:35:31.240273+00	percent	15.00	49.00	279.00
23	328.00	2	2026-10-27 10:37:38.446742+00	percent	15.00	49.00	279.00
24	776.00	4	2026-10-27 13:25:04.664902+00	percent	10.00	78.00	698.00
25	876.00	1	2026-10-27 13:53:15.622482+00	percent	10.00	88.00	788.00
26	219.00	1	2026-10-27 14:28:58.109687+00	percent	15.00	33.00	186.00
27	219.00	1	2026-10-27 14:58:11.906653+00	percent	10.00	22.00	197.00
28	229.00	1	2026-10-27 15:01:50.563235+00	percent	10.00	23.00	206.00
29	438.00	2	2026-10-27 15:21:49.063213+00	percent	15.00	66.00	372.00
30	219.00	1	2026-10-27 16:14:52.453933+00	percent	15.00	33.00	186.00
31	219.00	1	2026-10-27 16:16:02.422769+00	percent	15.00	33.00	186.00
32	458.00	2	2026-10-27 17:30:08.189254+00	percent	15.00	69.00	389.00
33	229.00	1	2026-10-28 07:37:40.60425+00	\N	0.00	0.00	229.00
34	896.00	4	2026-10-28 10:37:42.859328+00	percent	10.00	90.00	806.00
35	687.00	2	2026-10-28 12:47:05.855768+00	percent	15.00	103.00	584.00
36	687.00	2	2026-10-28 12:47:14.798168+00	percent	15.00	103.00	584.00
37	577.00	4	2026-10-28 14:03:56.687704+00	percent	5.00	29.00	548.00
38	960.00	7	2026-10-28 14:17:44.045068+00	percent	5.00	48.00	912.00
39	920.00	7	2026-10-28 14:33:17.882353+00	percent	5.00	46.00	874.00
40	219.00	1	2026-10-28 14:40:06.17851+00	\N	0.00	0.00	219.00
41	1442.00	2	2026-10-28 15:10:22.923923+00	\N	0.00	0.00	1442.00
42	219.00	1	2026-10-28 15:17:02.73298+00	\N	0.00	0.00	219.00
43	229.00	1	2026-10-28 15:57:50.922626+00	\N	0.00	0.00	229.00
44	229.00	1	2026-10-28 16:46:28.291902+00	percent	15.00	34.00	195.00
45	677.00	3	2026-10-28 17:03:37.048639+00	percent	10.00	68.00	609.00
46	796.00	4	2026-10-28 17:29:39.493937+00	\N	0.00	0.00	796.00
47	427.00	3	2026-10-28 17:48:44.937753+00	\N	0.00	0.00	427.00
48	99.00	1	2026-10-29 08:27:04.151804+00	\N	0.00	0.00	99.00
49	10.00	1	2026-10-29 12:46:49.787814+00	\N	0.00	0.00	10.00
50	99.00	1	2026-10-29 12:47:34.657898+00	\N	0.00	0.00	99.00
51	458.00	2	2026-10-29 13:01:24.898567+00	\N	0.00	0.00	458.00
52	219.00	1	2026-10-29 13:31:15.422753+00	\N	0.00	0.00	219.00
53	219.00	1	2026-10-29 13:35:39.175561+00	percent	5.00	11.00	208.00
54	268.00	2	2026-10-29 14:00:49.635917+00	\N	0.00	0.00	268.00
55	657.00	2	2026-10-29 16:55:34.012076+00	\N	0.00	0.00	657.00
56	79.00	1	2026-10-30 05:43:35.010483+00	\N	0.00	0.00	79.00
57	79.00	1	2026-10-30 05:52:30.368511+00	\N	0.00	0.00	79.00
64	229.00	1	2026-10-30 06:44:59.894649+00	\N	0.00	0.00	229.00
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment (id, order_id, amount, cash, online, status, created_at) FROM stdin;
1	1	237.00	0.00	0.00	Completed	2026-10-26 12:08:55.186617+00
2	2	220.00	0.00	0.00	Completed	2026-10-26 12:34:21.866171+00
3	4	372.00	0.00	0.00	Completed	2026-10-26 12:46:41.044358+00
4	5	1921.00	0.00	0.00	Completed	2026-10-26 13:23:26.119638+00
5	6	214.00	0.00	0.00	Completed	2026-10-26 13:43:04.049301+00
6	7	320.00	0.00	0.00	Completed	2026-10-26 13:55:56.039121+00
7	8	389.00	0.00	0.00	Completed	2026-10-26 13:56:17.842464+00
8	9	584.00	0.00	0.00	Completed	2026-10-26 14:13:43.843922+00
9	10	381.00	0.00	0.00	Completed	2026-10-26 14:18:38.875052+00
10	11	279.00	0.00	0.00	Completed	2026-10-26 14:34:34.985086+00
11	12	270.00	0.00	0.00	Completed	2026-10-26 14:50:41.571053+00
12	14	465.00	0.00	0.00	Completed	2026-10-26 15:08:56.613464+00
13	15	186.00	0.00	0.00	Completed	2026-10-26 15:13:31.26398+00
14	16	372.00	0.00	0.00	Completed	2026-10-26 15:14:08.872634+00
15	17	381.00	0.00	0.00	Completed	2026-10-26 15:28:18.800126+00
16	18	279.00	0.00	0.00	Completed	2026-10-26 15:35:46.565079+00
17	19	779.00	0.00	0.00	Completed	2026-10-26 16:10:10.660169+00
18	20	584.00	0.00	0.00	Completed	2026-10-26 17:20:26.026481+00
19	21	372.00	0.00	0.00	Completed	2026-10-26 17:20:53.314863+00
20	22	279.00	0.00	0.00	Completed	2026-10-27 10:35:34.375345+00
21	23	279.00	0.00	0.00	Completed	2026-10-27 10:37:41.470179+00
22	24	698.00	0.00	0.00	Completed	2026-10-27 13:25:07.099223+00
23	25	788.00	0.00	0.00	Completed	2026-10-27 13:53:17.628086+00
24	26	186.00	0.00	0.00	Completed	2026-10-27 14:36:09.796745+00
25	27	197.00	0.00	0.00	Completed	2026-10-27 14:58:41.427787+00
26	28	206.00	0.00	0.00	Completed	2026-10-27 15:01:55.008342+00
27	29	372.00	0.00	0.00	Completed	2026-10-27 15:21:54.187731+00
28	30	186.00	0.00	0.00	Completed	2026-10-27 16:15:23.679613+00
29	31	186.00	0.00	0.00	Completed	2026-10-27 16:16:09.208112+00
30	32	389.00	0.00	0.00	Completed	2026-10-27 17:30:13.631805+00
31	33	229.00	0.00	0.00	Completed	2026-10-28 07:37:50.273071+00
32	34	806.00	0.00	0.00	Completed	2026-10-28 10:38:00.229941+00
33	35	584.00	0.00	0.00	Completed	2026-10-28 12:47:11.213807+00
34	36	584.00	0.00	0.00	Completed	2026-10-28 12:47:20.323583+00
35	37	548.00	0.00	0.00	Completed	2026-10-28 14:04:05.182228+00
36	38	912.00	0.00	0.00	Completed	2026-10-28 14:17:50.972866+00
37	39	874.00	0.00	0.00	Completed	2026-10-28 14:33:24.373121+00
38	40	219.00	0.00	0.00	Completed	2026-10-28 14:40:11.429113+00
39	41	1442.00	0.00	0.00	Completed	2026-10-28 15:10:28.409032+00
40	42	219.00	0.00	0.00	Completed	2026-10-28 15:17:09.113377+00
41	43	229.00	0.00	0.00	Completed	2026-10-28 15:57:55.496705+00
42	44	195.00	0.00	0.00	Completed	2026-10-28 16:46:34.726551+00
43	45	609.00	0.00	0.00	Completed	2026-10-28 17:03:42.337592+00
44	46	796.00	0.00	0.00	Completed	2026-10-28 17:29:44.972668+00
45	47	427.00	0.00	0.00	Completed	2026-10-28 17:48:50.064834+00
46	48	99.00	0.00	0.00	Completed	2026-10-29 08:27:13.040235+00
47	49	10.00	0.00	0.00	Completed	2026-10-29 12:46:55.798165+00
48	50	99.00	0.00	0.00	Completed	2026-10-29 12:47:41.568417+00
49	51	458.00	0.00	0.00	Completed	2026-10-29 13:04:30.961443+00
50	53	208.00	0.00	0.00	Completed	2026-10-29 13:35:47.601+00
51	54	268.00	0.00	0.00	Completed	2026-10-29 14:00:55.948479+00
52	55	657.00	0.00	0.00	Completed	2026-10-29 16:55:59.703214+00
53	57	79.00	0.00	0.00	Completed	2026-10-30 05:52:32.064636+00
\.


--
-- Data for Name: product_subitem_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_subitem_groups (product_id, group_name) FROM stdin;
63	Choice of Bread
63	Choice of Protein
63	Choice of Sauce
63	Extra Toppings
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, category_id, name, price, image, is_active, created_at) FROM stdin;
9	9	Americano Hot	79.00	\N	1	2026-10-17 09:43:34+00
10	9	Americano Iced	89.00	\N	1	2026-10-17 09:43:51+00
13	9	Cappuccino Hot	99.00	\N	1	2026-10-17 09:45:15+00
14	9	Cappuccino Iced	109.00	\N	1	2026-10-17 09:45:36+00
17	14	Chicken Loaded Fries	229.00	\N	1	2026-10-17 09:46:47+00
18	13	Chicken Nuggets 8 Pcs	99.00	\N	1	2026-10-17 09:47:04+00
22	9	Cold Coffee	109.00	\N	1	2026-10-17 09:48:54+00
23	9	Espresso Double Shot	79.00	\N	1	2026-10-17 09:49:19+00
24	9	Espresso Single Shot	49.00	\N	1	2026-10-17 09:49:37+00
26	9	Flat White Hot	99.00	\N	1	2026-10-17 09:50:39+00
27	9	Flat White Iced	109.00	\N	1	2026-10-17 09:51:04+00
38	13	Peri Peri Fries	99.00	\N	1	2026-10-17 09:55:37+00
40	13	Plain Fries	89.00	\N	1	2026-10-17 09:56:14+00
43	5	Spicy Chicken Burger	229.00	\N	1	2026-10-17 09:57:29+00
45	5	Spicy Veg Burger	219.00	\N	1	2026-10-17 10:22:08+00
49	14	Veg Loaded Frice	219.00	\N	1	2026-10-17 10:23:03+00
54	3	Packaged Mineral Water 1Ltr	20.00	\N	1	2026-10-17 10:26:45+00
61	3	Sprite 200ml	20.00	\N	1	2026-10-17 10:29:06+00
64	14	Non Veg Loaded Fries	229.00	\N	1	2026-10-26 10:44:40.247812+00
59	3	Coca-Cola 200ml	15.00	\N	1	2026-10-17 10:28:20+00
66	3	water 500 ml	10.00	\N	1	2026-10-26 10:47:40.235636+00
60	3	Thums Up 200ml	25.00	\N	1	2026-10-17 10:28:37+00
67	3	Mocktail of the day	89.00	\N	1	2026-10-26 10:48:43.790165+00
63	19	Sandwich	0.00	\N	1	2026-10-26 10:54:21.161203+00
53	3	Coca-Cola Can	55.00	\N	1	2026-10-17 10:26:12+00
\.


--
-- Data for Name: subitems; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subitems (id, group_name, name, price, is_active, created_at) FROM stdin;
1	Choice of Bread	Focaccia	0.00	1	2026-10-25 09:58:48+00
2	Choice of Bread	Grilled	0.00	1	2026-10-25 09:58:48+00
3	Choice of Bread	Multigrain	0.00	1	2026-10-25 09:58:48+00
4	Choice of Bread	Sourdough	0.00	1	2026-10-25 09:58:48+00
5	Choice of Bread	Tosted	0.00	1	2026-10-25 09:58:48+00
6	Choice of Bread	White Panini	0.00	1	2026-10-25 09:58:48+00
7	Choice of Protein	Black Pepper Roasted Chicken	229.00	1	2026-10-25 09:58:48+00
8	Choice of Protein	Cheesy Avocado	219.00	1	2026-10-25 09:58:48+00
9	Choice of Protein	Chicken Salami	229.00	1	2026-10-25 09:58:48+00
10	Choice of Protein	Gochujang Tofu	219.00	1	2026-10-25 09:58:48+00
11	Choice of Protein	Grilled Panner	219.00	1	2026-10-25 09:58:48+00
12	Choice of Protein	Mayo Chicken	229.00	1	2026-10-25 09:58:48+00
13	Choice of Protein	Rosted Exotic Vegetable	219.00	1	2026-10-25 09:58:48+00
14	Choice of Protein	Tangy Mustard Chicken	229.00	1	2026-10-25 09:58:48+00
15	Choice of Sauce	Burger Mayo	0.00	1	2026-10-25 09:58:48+00
16	Choice of Sauce	Cilantro Pesto	0.00	1	2026-10-25 09:58:48+00
17	Choice of Sauce	Garlic Aioli	0.00	1	2026-10-25 09:58:48+00
18	Choice of Sauce	Pickle Mayo	0.00	1	2026-10-25 09:58:48+00
19	Choice of Sauce	Spicy Chipotle	0.00	1	2026-10-25 09:58:48+00
20	Extra Toppings	Cheese 2 Slice	40.00	1	2026-10-25 09:58:48+00
21	Extra Toppings	Chicken Protin	49.00	1	2026-10-25 09:58:48+00
22	Extra Toppings	Extra Sauce	20.00	1	2026-10-25 09:58:48+00
23	Extra Toppings	No Lettuce	0.00	1	2026-10-25 09:58:48+00
24	Extra Toppings	No Onion	0.00	1	2026-10-25 09:58:48+00
25	Extra Toppings	No Roasted Tomato	0.00	1	2026-10-25 09:58:48+00
26	Extra Toppings	Veg Protin	39.00	1	2026-10-25 09:58:48+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, name, created_at) FROM stdin;
1	admin	$2a$10$C7nzkxA9zs/gvRj4QC1VEOEH7kqPB9UTEhXn/ykKGiMA12fmOgMRy	Administrator	2026-10-25 05:50:00+00
\.


--
-- Name: cart_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cart_id_seq', 2731, true);


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 3644, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 23, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 61, true);


--
-- Name: order_item_subitems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_item_subitems_id_seq', 196, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 132, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 68, true);


--
-- Name: payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_id_seq', 59, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 67, true);


--
-- Name: subitems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subitems_id_seq', 27, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, false);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: order_item_subitems order_item_subitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_subitems
    ADD CONSTRAINT order_item_subitems_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: product_subitem_groups product_subitem_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_subitem_groups
    ADD CONSTRAINT product_subitem_groups_pkey PRIMARY KEY (product_id, group_name);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: subitems subitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subitems
    ADD CONSTRAINT subitems_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_cart_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items ON public.cart_items USING btree (cart_id);


--
-- Name: idx_customers_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_order ON public.customers USING btree (order_id);


--
-- Name: idx_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_ois_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ois_item ON public.order_item_subitems USING btree (order_item_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- Name: idx_payment_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_order ON public.payment USING btree (order_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_subitems_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subitems_group ON public.subitems USING btree (group_name);


--
-- Name: order_items fk_items_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_item_subitems fk_ois_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_subitems
    ADD CONSTRAINT fk_ois_item FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: payment fk_payment_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: product_subitem_groups fk_psg_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_subitem_groups
    ADD CONSTRAINT fk_psg_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: order_item_subitems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_item_subitems ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

--
-- Name: product_subitem_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_subitem_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: subitems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subitems ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict nFKbJ9OLainmE7Ab3Vj0Ip9DvTK1XuT0gkxeqsT7s37CB1TNggjH3t5vZ2XfFyf

