import React, { Component } from "react";

import './App.css';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            goodsQuantity: 2,
            goodsList: []
        };
    }


  handleScroll = () => {
    if ((window.innerWidth + window.scrollX) >= document.querySelector('.grid').scrollWidth) {

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
      window.addEventListener('scroll', this.handleScroll);
  }

  render() {

    return (
        <div className="grid">
            {this.state.goodsList.map((item) => (
                <li className="item" key={item.id}>{item.id} {item.name}
                <img src={ item.picture } />
                </li>
            ))}
        </div>
    );
  }
}

export default App;
