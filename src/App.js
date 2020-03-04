import React, { Component } from "react";

import Rating from '@material-ui/lab/Rating';

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
      fetch('https://api.jsonbin.io/b/5e5fd9bbbaf60366f0e2cf61/7')
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
        <section className="cards__grid">

            <article className="card card_heading">
                <ul className="card__characteristics">
                    <li className="card__rating">
                        <strong>Рейтинг</strong>
                    </li>
                    <li className="card__price">
                        <strong>Цена</strong>
                    </li>
                    <li className="card__color">
                        <strong>Цвет</strong>
                    </li>
                    <li className="card__material">
                        <strong>Материал</strong>
                    </li>
                    <li className="card__size">
                        <strong>Размер</strong>
                    </li>
                    <li className="card__mechanism">
                        <strong>Механизм</strong>
                    </li>
                    <li className="card__seller">
                        <strong>Продавец</strong>
                    </li>
                </ul>
            </article>
            
            {this.state.goodsList.map((item) => (
                <article key={ item.id } className="card" tabIndex="1">
                    <figure className="card__picture">
                            <img src={ item.picture } alt={ `Изображение ${item.name.toLowerCase()}` }/>
                    </figure>
                    <a className="card__title" href="#" title={ `Смотреть товар ${ item.name }` }>
                        <strong>{ item.name }</strong>
                    </a>
                    <ul className="card__characteristics">
                        <li className="card__rating">
                            <Rating
                              name="read-only"
                              value={ +item.rate }
                              readOnly
                            />
                            <strong>{ item.rate }</strong>
                        </li>
                        { item.newPrice ? (
                            <li className="card__price">
                                <strong className="card__price_new">{ item.newPrice }</strong>
                                <span className="card__price_old">{ item.price }</span>
                            </li>
                        ) : (
                            <li className="card__price">
                                <span className="card__price">{ item.price }</span>
                            </li>
                        )}
                        <li className="card__color">
                            { item.color }
                        </li>
                        <li className="card__material">
                            { item.material }
                        </li>
                        <li className="card__size">
                            { item.size }
                        </li>
                        <li className="card__mechanism">
                            { item.mechanism }
                        </li>
                        <li className="card__seller">
                            <a
                                href={ item.sellerLink }
                                title={ `Перейти на сайт ${ item.seller }` }
                                target="_blank">
                                    { item.seller }
                            </a>
                        </li>
                    </ul>
                    { item.likesBlocked ? (
                        <section className="card__functionality">
                            <button className="button button_buy" data-expanded="true">Купить</button>
                        </section>
                    ) : (
                        <section className="card__functionality">
                            <button className="button button_like"></button>
                            <button className="button button_buy">Купить</button>
                        </section>
                    )}
                </article>
            ))}
        </section>
    );
  }
}

export default App;
