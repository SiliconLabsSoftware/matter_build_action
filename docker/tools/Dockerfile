# Set build argument for base image version
ARG VERSION=latest

# Stage 1: Build dependencies and download SDKs/tools
FROM ghcr.io/project-chip/chip-build:${VERSION} AS build
LABEL org.opencontainers.image.source https://github.com/project-chip/connectedhomeip

# Install required packages for cloning and extracting SDKs
RUN set -x \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -fy --no-install-recommends \
    git \
    git-lfs \
    zip \
    tar \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/ \
    && : # last line

# Set UTF-8 locale to ensure unzip handles non-ASCII filenames correctly
# util/third_party/ot-br-posix/third_party/cpp-httplib/repo/test/www/#U65e5#U672c#U8a9eDir/#U65e5#U672c#U8a9eFile.txt
ENV LANG=C.UTF-8

# - name: Setup SLT
# id: setup-action
# uses: SiliconLabsSoftware/action-setup-slt@main
#Setup SLT
RUN set -x \
    && curl https://www.silabs.com/documents/public/software/slt-cli-1.0.0-linux-x64.zip --output /tmp/slt-cli-1.0.0-linux-x64.zip \
    && unzip /tmp/slt-cli-1.0.0-linux-x64.zip -d /tmp/slt-cli \
    && rm /tmp/slt-cli-1.0.0-linux-x64.zip \
    && chmod +x /tmp/slt-cli/slt \
    && : # last line

ENV PATH="${PATH}:/tmp/slt-cli"
ENV SLT_CI=true

RUN set -x \
    && echo "slt-version=$(slt --version)" \
    && echo "slt-path=$(which slt)" \
    && : # last line


RUN set -x \
    && slt install foo --engine conan || true \
    && CONAN_ENGINE_PATH="$HOME/.silabs/slt/engines/conan/conan_engine" \
    && CONAN_PATH="$HOME/.silabs/slt/engines/conan/conan/conan" \
    && INSTALL_PATH="$HOME/.local/bin" \
    && if [ -f "$CONAN_ENGINE_PATH" ]; then \
        ln -s "$CONAN_ENGINE_PATH" "$INSTALL_PATH/conan_engine" \
    else \
        echo "Error: conan_engine not found at $CONAN_ENGINE_PATH" \
        exit 1 \
    fi \
    && echo "conan-engine-version=$(conan_engine --version)" \
    && echo "conan-engine-path=$(which conan_engine)" \
    && if [ -f "$CONAN_PATH" ]; then \
        ln -s "$CONAN_PATH" "$INSTALL_PATH/conan" \
    else \
        echo "Error: conan not found at $CONAN_PATH" \
    fi \
    && echo "conan-version=$(conan --version)" \
    && echo "conan-path=$(which conan)" \
    && echo "CONAN_HOME=$HOME/.silabs/slt/installs/conan" \
    && : # last line

ENV CONAN_HOME=$HOME/.silabs/slt/installs/conan

RUN set -x \
    && slt install slc-cli \
    && SLC_CLI_PATH=$(slt where slc-cli) \
    && echo "SLC_CLI_PATH=$SLC_CLI_PATH" \
    && JAVA_HOME=$(slt where java21) \
    && echo "JAVA_HOME=$JAVA_HOME" \
    && echo "$SLC_CLI_PATH" >> $GITHUB_PATH \
    && if [ -n "$JAVA_HOME" ]; then \
        echo "$JAVA_HOME/jre/bin" >> $GITHUB_PATH \
    fi \
    && : # last line

ENV SLC_CLI_PATH=$(slt where slc-cli)
ENV JAVA_HOME=$(slt where java21)
ENV PATH="${PATH}:${SLC_CLI_PATH}"
ENV PATH="${PATH}:${JAVA_HOME}/jre/bin"


RUN set -x \
    && slt install commander \
    && COMMANDER_PATH=$(slt where commander) \
    && echo "COMMANDER_PATH=$COMMANDER_PATH" \
    && echo "$COMMANDER_PATH" >> $GITHUB_PATH \
    && : # last line

ENV COMMANDER_PATH=$(slt where commander)
ENV PATH="${PATH}:${COMMANDER_PATH}"


RUN set -x \
    && slt install gcc-arm-none-eabi \
    && ARM_GCC_DIR=$(slt where gcc-arm-none-eabi) \
    && echo "ARM_GCC_DIR=$ARM_GCC_DIR" \
    && echo "$ARM_GCC_DIR/bin" >> $GITHUB_PATH \
    && : # last line

ENV ARM_GCC_DIR=$(slt where gcc-arm-none-eabi)
ENV PATH="${PATH}:${ARM_GCC_DIR}/bin"
