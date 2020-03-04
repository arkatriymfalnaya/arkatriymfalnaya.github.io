import React, { Component } from "react";

import './App.css';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            goodsQuantity: 10,
            goodsList: []
        };
    }


  handleScroll = () => {
    if ((window.innerWidth + document.querySelector('.cards__grid').scrollLeft) >= document.querySelector('.cards__grid').scrollWidth) {
        this.loadGoods(this.state.goodsQuantity++);
    }
  }

  loadGoods = (quantity) => {
      fetch('https://api.jsonbin.io/b/5e5fd9bbbaf60366f0e2cf61/3')
        .then((response) => response.json())
        .then(data => {
            let result = data.filter((item, id) => id <= this.state.goodsQuantity + quantity);

            this.setState({ goodsList: result });
        });
  }

  componentWillMount() {
      this.loadGoods(this.state.goodsQuantity);
  }

  componentDidMount() {
      document.querySelector('.cards__grid').addEventListener('scroll', this.handleScroll);
  }

  render() {

    return (
        <div className="cards__grid">

            <div className="card card_heading">
                <div className="card__rating">Рейтинг</div>
                <div className="card__price">Цена</div>
                <div className="card__color">Цвет</div>
                <div className="card__material">Материал</div>
                <div className="card__size">Размер</div>
                <div className="card__mechanism">Механизм</div>
                <div className="card__seller">Продавец</div>
            </div>
            {this.state.goodsList.map((item) => (
                <div id={ item.id } className="card">
                    <div className="card__picture">
                        <img src={ item.picture } alt="Изображение { item.name.toLowerCase() }"/>
                    </div>
                    <div className="card__title">{ item.name }</div>
                    <div className="card__rating">{ item.rating }</div>
                    <div className="card__price">
                        { item.price }
                        {item.newPrice &&
                            <span>{ item.newPrice }</span>
                          }
                    </div>
                    <div className="card__color">{ item.color }</div>
                    <div className="card__material">{ item.material }</div>
                    <div className="card__size">{ item.size }</div>
                    <div className="card__mechanism">{ item.mechanism }</div>
                    <div className="card__seller"><a href="" title={ item.sellerLink } target="_blank">{ item.seller }</a></div>
                    <div className="card__seller">
                        <button className="button button_like">like</button>
                        <button className="button button_buy">buy</button>
                    </div>
                </div>
            ))}
        </div>
    );
  }
}

export default App;
