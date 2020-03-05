import React, { useState, useEffect } from "react";

import Card from '../Card';

import './index.css';

export default function App() {
    let [ goodsQuantity ] = useState(10);
    let [ goodsList, setGoodsList ] = useState([])



    useEffect(() => {
        const handleScroll = () => {
            if (
                (window.innerWidth + document.querySelector('.cards__grid').scrollLeft) >=
                document.querySelector('.cards__grid').scrollWidth) {

                loadGoods(goodsQuantity++);
            }
        }

        const loadGoods = (quantity) => {
            fetch('https://api.jsonbin.io/b/5e5fd9bbbaf60366f0e2cf61/7')
                .then((response) => response.json())
                .then(data => {
                    let result = data.filter((item, id) => id <= goodsQuantity + quantity);
                    setGoodsList(result);
                });
        }

        loadGoods(goodsQuantity);
        document.querySelector('.cards__grid').addEventListener('scroll', handleScroll);
    }, [goodsQuantity]);

    return (
        <section className = "cards__grid">
            <Card heading />

            {goodsList.map((item) => (
                <Card
                    key = { item.id }
                    good = { item }
                />
            ))}
        </section>
    );
}
