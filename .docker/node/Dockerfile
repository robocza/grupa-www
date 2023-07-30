FROM node:18.16

RUN apt-get update

# fish
RUN FISH_VERSION="3.6.1" \
    && apt-get install -y cmake libncurses5-dev libpcre2-dev \
    && curl -OSLs "https://github.com/fish-shell/fish-shell/releases/download/$FISH_VERSION/fish-$FISH_VERSION.tar.xz" \
    && tar -xJf "fish-$FISH_VERSION.tar.xz" \
    && cd "fish-$FISH_VERSION" \
    && mkdir build \
    && cd build \
    && cmake .. \
    && make \
    && make install \
    && cd / \
    && rm -rf "fish-$FISH_VERSION" "fish-$FISH_VERSION.tar.xz" \
    && fish -c true

# cleanup
RUN apt-get clean autoclean && apt-get autoremove -y

RUN mkdir -p /var/www/.local/share/fish

WORKDIR /app
