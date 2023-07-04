
let imgTag = document.getElementById('imgTag')
let date

function changeImage(e) {
    imgTag.src = URL.createObjectURL(e.target.files[0])
}
function addToCart(proId) {
    $.ajax({
        url: '/add-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
        }
    })
}

// changeQuantity
function changeQuantity(cartId, proId, userId, count) {
    let quantity = parseInt(document.getElementById(proId).innerHTML)
    count = parseInt(count)
    $.ajax({
        url: '/change-quantity',
        data: {
            user: userId,
            cart: cartId,
            product: proId,
            count: count,
            quantity: quantity
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                alert('Product removed from cart')
                location.reload()
            } else {
                document.getElementById("sub-total").innerHTML = response.total
                document.getElementById(proId).innerHTML= quantity+count
            }
        }
    })
}



function removeProduct(proId, cartId) {
    $.ajax({
        url: '/cart-product-remove',
        data: {
            product: proId,
            cart: cartId
        },
        method: 'post',
        success: (resopnse) => {
            location.reload()
        }
    })
}
